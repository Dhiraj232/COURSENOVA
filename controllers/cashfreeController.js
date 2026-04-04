/**
 * cashfreeController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready Cashfree Payment Controller for RENVOX AI
 *
 * Endpoints:
 *   POST /api/cashfree/create-order   — Authenticated; creates CF order + saves to DB
 *   POST /api/cashfree/verify         — Authenticated; manual verify (frontend callback)
 *   POST /api/cashfree/webhook        — Public; Cashfree server-to-server event handler
 *
 * Security:
 *   • Webhook signature verified with raw HMAC-SHA256 (not SDK method — more reliable)
 *   • Payment status NEVER trusted from frontend
 *   • Idempotency: duplicate webhook events are ignored via `processed` flag
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { Cashfree, CFEnvironment } = require('cashfree-pg');
const crypto     = require('crypto');

// ── Models ───────────────────────────────────────────────────────────────────
const CourseOrder  = require('../models/CourseOrder');
const Payment      = require('../models/Payment');      // legacy — kept for admin panel
const Enrollment   = require('../models/Enrollment');
const Course       = require('../models/Course');
const User         = require('../models/User');
const Transaction  = require('../models/Transaction');
const Activity     = require('../models/Activity');

// ── Environment / Credentials ─────────────────────────────────────────────────
const CF_APP_ID    = (process.env.CASHFREE_APP_ID    || '').trim();
const CF_SECRET    = (process.env.CASHFREE_SECRET_KEY || '').trim();
const CF_ENV_RAW   = (process.env.CASHFREE_ENV        || 'SANDBOX').toUpperCase();

if (!CF_APP_ID || !CF_SECRET) {
    console.error('❌ CRITICAL: CASHFREE_APP_ID or CASHFREE_SECRET_KEY is missing in .env!');
}

// ── Detect environment from APP_ID prefix (crash-safe) ───────────────────────
let resolvedEnv;
if (CF_APP_ID.startsWith('TEST')) {
    if (CF_ENV_RAW === 'PRODUCTION') {
        console.warn('⚠️  Test APP_ID detected but CASHFREE_ENV=PRODUCTION — enforcing SANDBOX.');
    }
    resolvedEnv = CFEnvironment ? CFEnvironment.SANDBOX : 1;
    console.log('ℹ️  Cashfree: Running in SANDBOX (Test) mode.');
} else {
    resolvedEnv = CFEnvironment ? CFEnvironment.PRODUCTION : 2;
    console.log('🟢 Cashfree: Running in LIVE PRODUCTION mode.');
}

Cashfree.XClientId     = CF_APP_ID;
Cashfree.XClientSecret = CF_SECRET;
Cashfree.XEnvironment  = resolvedEnv;

// ── Cashfree API version (use a stable date) ──────────────────────────────────
const CF_API_VERSION = '2023-08-01';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — verify Cashfree webhook signature via raw HMAC-SHA256
// Cashfree signs: timestamp + rawBody  (without separation)
// Docs: https://docs.cashfree.com/docs/webhook-security
// ─────────────────────────────────────────────────────────────────────────────
function verifyWebhookSignature(rawBody, signature, timestamp) {
    if (!signature || !timestamp) return false;
    try {
        const signedPayload    = timestamp + rawBody;
        const expectedSig      = crypto
            .createHmac('sha256', CF_SECRET)
            .update(signedPayload)
            .digest('base64');
        return crypto.timingSafeEqual(
            Buffer.from(expectedSig),
            Buffer.from(signature)
        );
    } catch (err) {
        console.error('[Webhook] Signature computation error:', err.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — find course by ObjectId, slug, or title (flexible input)
// ─────────────────────────────────────────────────────────────────────────────
async function findCourse(courseId) {
    if (String(courseId).match(/^[0-9a-fA-F]{24}$/)) {
        const byId = await Course.findById(courseId);
        if (byId) return byId;
    }
    const bySlug = await Course.findOne({ slug: String(courseId).toLowerCase().replace(/\s+/g, '-') });
    if (bySlug) return bySlug;
    return Course.findOne({ title: { $regex: new RegExp(`^${courseId}$`, 'i') } });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — enroll user in course (shared by webhook + verifyPayment)
// ─────────────────────────────────────────────────────────────────────────────
async function enrollUser({ userId, courseId, paymentId, amount, orderId, courseTitle }) {
    // 1. Enrollment record (upsert)
    await Enrollment.findOneAndUpdate(
        { userId, courseId: String(courseId) },
        {
            userId,
            courseId: String(courseId),
            courseName: courseTitle,
            paymentId: String(paymentId),
            amount,
            purchaseDate: new Date(),
        },
        { upsert: true, new: true }
    );

    // 2. User.enrolledCourses quick-lookup array
    await User.findByIdAndUpdate(userId, {
        $addToSet: { enrolledCourses: String(courseId) }
    });

    // 3. Transaction record (non-fatal)
    try {
        await Transaction.create({
            userId,
            courseId:   String(courseId),
            courseName: courseTitle,
            amount,
            paymentId:  String(paymentId),
            orderId,
            status: 'success',
        });
    } catch (e) {
        console.warn('[enrollUser] Transaction log skipped:', e.message);
    }

    // 4. Activity log (non-fatal)
    try {
        await Activity.create({
            userId,
            type:        'course_enrolled',
            title:       `Enrolled: ${courseTitle}`,
            description: `Purchased premium course "${courseTitle}" via Cashfree.`,
            courseId:    String(courseId),
            courseName:  courseTitle,
        });
    } catch (e) {
        console.warn('[enrollUser] Activity log skipped:', e.message);
    }

    console.log(`✅ [enrollUser] User ${userId} enrolled in course ${courseId} | paymentId: ${paymentId}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. CREATE ORDER
//    POST /api/cashfree/create-order
//    Requires: JWT auth (requireAuth middleware)
// ═════════════════════════════════════════════════════════════════════════════
exports.createOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.userId;

        if (!courseId) {
            return res.status(400).json({ ok: false, message: 'courseId is required' });
        }

        const course = await findCourse(courseId);
        if (!course) {
            return res.status(404).json({ ok: false, message: 'Course not found. Check the courseId.' });
        }

        const isPaid = course.price > 0 && !course.isFree;
        if (!isPaid) {
            return res.status(400).json({ ok: false, message: 'This course is free — use the Enroll Free button.' });
        }

        // Check if user is already enrolled (prevent duplicate purchases)
        const existing = await Enrollment.findOne({ userId, courseId: String(course._id) });
        if (existing) {
            return res.status(409).json({ ok: false, message: 'Already enrolled in this course.' });
        }

        // ── Fetch user details ───────────────────────────────────
        const user = await User.findById(userId);
        const customerEmail = user?.email || 'user@renvox.in';
        const customerName  = user?.name  || 'Course User';
        const customerPhone = user?.phone || '9999999999';

        // ── Generate unique order ID ─────────────────────────────
        const orderId = `renvox_${String(userId).slice(-6)}_${Date.now()}`;

        const baseUrl   = process.env.BASE_URL || 'https://renvox-ai.onrender.com';
        const returnUrl = `${baseUrl}/premium-course-player.html?course=${course._id}&payment=verify&order_id=${orderId}`;
        const notifyUrl = `${baseUrl}/api/cashfree/webhook`;

        const cfRequest = {
            order_amount:   course.price,
            order_currency: 'INR',
            order_id:       orderId,
            customer_details: {
                customer_id:    String(userId),
                customer_email: customerEmail,
                customer_name:  customerName,
                customer_phone: customerPhone,
            },
            order_meta: {
                return_url: returnUrl,
                notify_url: notifyUrl,
            },
            order_note: `Course purchase - ${course.title}`,
        };

        console.log('[createOrder] Sending to Cashfree:', JSON.stringify(cfRequest, null, 2));

        let cfResponse;
        try {
            cfResponse = await Cashfree.PGCreateOrder(CF_API_VERSION, cfRequest);
        } catch (cfErr) {
            const errData = cfErr.response?.data;
            console.error('[createOrder] Cashfree API error:', JSON.stringify(errData || cfErr.message, null, 2));
            return res.status(502).json({
                ok:      false,
                message: 'Cashfree API rejected the order.',
                details: errData?.message || errData?.error_detail || cfErr.message,
            });
        }

        const { payment_session_id } = cfResponse.data;

        // ── Persist order in DB ──────────────────────────────────
        await CourseOrder.create({
            userId,
            courseId:         course._id,
            orderId,
            paymentSessionId: payment_session_id,
            amount:           course.price,
            status:           'pending',
        });

        // ── Also write to legacy Payment model (admin panel compatibility) ──
        try {
            await Payment.create({
                userId,
                courseId:         String(course._id),
                courseName:       course.title,
                amount:           course.price,
                orderId,
                paymentSessionId: payment_session_id,
                paymentMethod:    'cashfree',
                status:           'PENDING',
            });
        } catch (e) {
            console.warn('[createOrder] Legacy Payment record skipped:', e.message);
        }

        console.log(`[createOrder] ✅ Order ${orderId} created — ₹${course.price} | course: ${course.title}`);

        return res.json({
            ok:                true,
            payment_session_id,
            orderId,
            amount:            course.price,
            courseId:          course._id,
        });

    } catch (error) {
        console.error('[createOrder] Unexpected error:', error.message, error.stack);
        return res.status(500).json({ ok: false, message: 'Failed to create order. Please try again.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. VERIFY PAYMENT (frontend redirect fallback)
//    POST /api/cashfree/verify
//    Requires: JWT auth (requireAuth middleware)
//    NOTE: This is a fallback for when webhook fails to reach the server.
//          We still verify via Cashfree API — never trust frontend data.
// ═════════════════════════════════════════════════════════════════════════════
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, courseId } = req.body;
        const userId = String(req.userId);

        if (!orderId || !courseId) {
            return res.status(400).json({ ok: false, message: 'Missing orderId or courseId' });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });

        // Check for idempotency — webhook may have already processed this
        const orderRecord = await CourseOrder.findOne({ orderId });
        if (orderRecord && orderRecord.status === 'paid') {
            console.log(`[verifyPayment] ✅ Order ${orderId} already paid & enrolled.`);
            return res.json({ ok: true, message: 'Payment already verified.', courseName: course.title });
        }

        // ── Ask Cashfree for ground truth ────────────────────────
        let payments;
        try {
            const cfResp = await Cashfree.PGOrderFetchPayments(CF_API_VERSION, orderId);
            payments = cfResp.data;
        } catch (cfErr) {
            console.error('[verifyPayment] Cashfree fetch error:', cfErr.response?.data || cfErr.message);
            return res.status(502).json({ ok: false, message: 'Unable to verify payment with Cashfree.' });
        }

        const successPayment = Array.isArray(payments)
            ? payments.find(p => p.payment_status === 'SUCCESS')
            : null;

        if (!successPayment) {
            // Mark as failed if a record exists
            if (orderRecord) {
                orderRecord.status = 'failed';
                orderRecord.failureReason = 'No successful payment found via API verify.';
                await orderRecord.save();
            }
            await Payment.findOneAndUpdate({ orderId }, { status: 'FAILED' });
            return res.status(400).json({ ok: false, message: 'Payment not successful. Please retry or contact support.' });
        }

        const paymentId = String(successPayment.cf_payment_id);
        const paidAmount = successPayment.payment_amount;

        // ── Update CourseOrder ───────────────────────────────────
        if (orderRecord) {
            orderRecord.status    = 'paid';
            orderRecord.paymentId = paymentId;
            orderRecord.processed = true;
            await orderRecord.save();
        }

        // ── Update legacy Payment record ─────────────────────────
        await Payment.findOneAndUpdate({ orderId }, { status: 'SUCCESS', paymentId });

        // ── Enroll user ──────────────────────────────────────────
        await enrollUser({
            userId,
            courseId:    course._id,
            paymentId,
            amount:      paidAmount,
            orderId,
            courseTitle: course.title,
        });

        return res.json({ ok: true, message: 'Payment verified successfully!', courseName: course.title });

    } catch (error) {
        console.error('[verifyPayment] Unexpected error:', error.message, error.stack);
        return res.status(500).json({ ok: false, message: 'Payment verification failed.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. WEBHOOK HANDLER
//    POST /api/cashfree/webhook
//    PUBLIC — Called by Cashfree servers (no JWT auth)
//    CRITICAL: Must receive raw body (req.rawBody) for signature verification
// ═════════════════════════════════════════════════════════════════════════════
exports.webhookHandler = async (req, res) => {
    // ── 1. Always respond 200 quickly to Cashfree ─────────────────────────────
    //    We ack first, then process. Cashfree retries if it gets non-200.
    //    But we validate signature BEFORE acking to reject invalid requests.

    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody   = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    // ── 2. Signature Verification ─────────────────────────────────────────────
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
        console.error(`[Webhook] ❌ Invalid signature | ts=${timestamp} | sig=${signature?.slice(0, 20)}...`);
        return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid webhook signature.' });
    }

    // ── 3. Parse payload ──────────────────────────────────────────────────────
    let payload;
    try {
        payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    } catch (parseErr) {
        console.error('[Webhook] Failed to parse JSON body:', parseErr.message);
        return res.status(400).json({ ok: false, message: 'Bad Request: invalid JSON.' });
    }

    const eventType = payload.type || '';
    const orderId   = payload.data?.order?.order_id || '';
    const paymentId = String(payload.data?.payment?.cf_payment_id || '');
    const amount    = payload.data?.payment?.payment_amount || 0;

    console.log(`[Webhook] 📩 Event: ${eventType} | orderId: ${orderId} | paymentId: ${paymentId}`);

    // ── 4. Idempotency guard ──────────────────────────────────────────────────
    const orderRecord = orderId ? await CourseOrder.findOne({ orderId }) : null;

    if (orderRecord?.processed) {
        console.log(`[Webhook] ⏭️  Order ${orderId} already processed — skipping.`);
        return res.status(200).json({ ok: true, message: 'Already processed.' });
    }

    // ── 5. Route by event type ────────────────────────────────────────────────
    try {
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
            await handlePaymentSuccess({ orderRecord, orderId, paymentId, amount, payload });
        } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
            await handlePaymentFailed({ orderRecord, orderId, payload });
        } else {
            console.log(`[Webhook] ℹ️  Unhandled event type: ${eventType} — ignoring.`);
        }
    } catch (handlerErr) {
        console.error(`[Webhook] ❌ Handler error for ${eventType}:`, handlerErr.message, handlerErr.stack);
        // Return 200 anyway so Cashfree doesn't keep retrying an application-level error
        return res.status(200).json({ ok: false, message: 'Processing error logged.' });
    }

    return res.status(200).json({ ok: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK SUB-HANDLER — PAYMENT_SUCCESS_WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────
async function handlePaymentSuccess({ orderRecord, orderId, paymentId, amount, payload }) {
    console.log(`[Webhook] ✅ PAYMENT_SUCCESS for order: ${orderId}`);

    if (!orderRecord) {
        console.warn(`[Webhook] ⚠️  No CourseOrder found for orderId: ${orderId}. Cannot enroll.`);
        // Still update legacy Payment if it exists
        await Payment.findOneAndUpdate({ orderId }, { status: 'SUCCESS', paymentId });
        return;
    }

    // Update CourseOrder
    orderRecord.status           = 'paid';
    orderRecord.paymentId        = paymentId;
    orderRecord.processed        = true;
    orderRecord.webhookEvent     = 'PAYMENT_SUCCESS_WEBHOOK';
    orderRecord.webhookReceivedAt = new Date();
    await orderRecord.save();

    // Update legacy Payment record
    await Payment.findOneAndUpdate({ orderId }, { status: 'SUCCESS', paymentId });

    // Fetch course title for logs/activity
    const course = await Course.findById(orderRecord.courseId);
    if (!course) {
        console.error(`[Webhook] Course ${orderRecord.courseId} not found! Cannot enroll.`);
        return;
    }

    // Enroll user — fully idempotent (upsert)
    await enrollUser({
        userId:      String(orderRecord.userId),
        courseId:    orderRecord.courseId,
        paymentId,
        amount:      amount || orderRecord.amount,
        orderId,
        courseTitle: course.title,
    });

    console.log(`[Webhook] 🎉 User ${orderRecord.userId} successfully enrolled in "${course.title}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK SUB-HANDLER — PAYMENT_FAILED_WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────
async function handlePaymentFailed({ orderRecord, orderId, payload }) {
    const failReason =
        payload.data?.payment?.payment_message ||
        payload.data?.error_details?.error_description ||
        'Payment failed.';

    console.warn(`[Webhook] ❌ PAYMENT_FAILED for order: ${orderId} | Reason: ${failReason}`);

    if (orderRecord) {
        orderRecord.status           = 'failed';
        orderRecord.failureReason    = failReason;
        orderRecord.processed        = true;
        orderRecord.webhookEvent     = 'PAYMENT_FAILED_WEBHOOK';
        orderRecord.webhookReceivedAt = new Date();
        await orderRecord.save();
    }

    await Payment.findOneAndUpdate({ orderId }, { status: 'FAILED' });
}
