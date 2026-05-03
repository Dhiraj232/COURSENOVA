/**
 * cashfreeController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready Cashfree Payment Controller for COURSENOVA
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
const MockTestPack = require('../models/MockTestPack');

// ── Environment / Credentials ─────────────────────────────────────────────────
const CF_APP_ID    = (process.env.CASHFREE_APP_ID    || '').trim();
const CF_SECRET    = (process.env.CASHFREE_SECRET_KEY || '').trim();
const CF_ENV_RAW   = (process.env.CASHFREE_ENV        || 'SANDBOX').toUpperCase();

if (!CF_APP_ID || !CF_SECRET) {
    console.error('❌ CRITICAL: CASHFREE_APP_ID or CASHFREE_SECRET_KEY is missing in .env!');
}

// ── Detect environment from APP_ID prefix (crash-safe) ───────────────────────
let resolvedEnv, sdkMode;
if (CF_APP_ID.startsWith('TEST')) {
    if (CF_ENV_RAW === 'PRODUCTION') {
        console.warn('⚠️  Test APP_ID detected but CASHFREE_ENV=PRODUCTION — enforcing SANDBOX.');
    }
    resolvedEnv = CFEnvironment ? CFEnvironment.SANDBOX : 0;
    sdkMode     = 'sandbox';
    console.log('🧪 Cashfree: Running in TEST SANDBOX mode.');
} else {
    resolvedEnv = CFEnvironment ? CFEnvironment.PRODUCTION : 1;
    sdkMode     = 'production';
    console.log('🟢 Cashfree: Running in LIVE PRODUCTION mode.');
}

/**
 * ── SDK v5 Initialization ────────────────────────────────────────────────────
 * Since version 5.1.0, the Cashfree object is a Class, not a static namespace.
 */
const cashfree = new Cashfree(resolvedEnv, CF_APP_ID, CF_SECRET);
console.log('🚀 Cashfree: Initialized (v5.1.0 SDK)');

/**
 * ── GET SDK CONFIG ────────────────────────────────────────────────────────
 * Returns mode (sandbox/production) for the frontend SDK initialization.
 * GET /api/cashfree/config
 */
exports.getCFConfig = (req, res) => {
    res.json({ ok: true, mode: sdkMode });
};

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
        cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
        return true;
    } catch (err) {
        console.error('[Webhook] Signature computation error:', err.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — find course or mock test (flexible input)
// ─────────────────────────────────────────────────────────────────────────────
async function findItem(itemId) {
    console.log(`[findItem] Searching for item with input: "${itemId}"`);
    
    // 1. Try by MongoDB ObjectId
    if (String(itemId).match(/^[0-9a-fA-F]{24}$/)) {
        const byId = await Course.findById(itemId);
        if (byId) {
            console.log(`[findItem] ✅ Found course by ObjectId: ${byId.title}`);
            return { doc: byId, type: 'course' };
        }
        const testById = await MockTestPack.findById(itemId);
        if (testById) {
            console.log(`[findItem] ✅ Found mock pack by ObjectId: ${testById.title}`);
            return { doc: testById, type: 'mock' };
        }
    }

    const escapedTitle = String(itemId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRegex = new RegExp(`^${escapedTitle}$`, 'i');
    
    // Check Courses
    const course = await Course.findOne({ 
        $or: [
            { _id: String(itemId).match(/^[0-9a-fA-F]{24}$/) ? itemId : null },
            { slug: String(itemId).toLowerCase().trim().replace(/\s+/g, '-') },
            { title: { $regex: titleRegex } }
        ]
    });
    if (course) {
        console.log(`[findItem] ✅ Found course: ${course.title}`);
        return { 
            doc: course, 
            type: 'course',
            meta: { _id: course._id, slug: course.slug, title: course.title }
        };
    }

    // Check Mock Packs
    const pack = await MockTestPack.findOne({
        $or: [
            { _id: String(itemId).match(/^[0-9a-fA-F]{24}$/) ? itemId : null },
            { id: String(itemId).trim() },
            { title: { $regex: titleRegex } }
        ]
    });
    if (pack) {
        console.log(`[findItem] ✅ Found mock pack: ${pack.title}`);
        return { 
            doc: pack, 
            type: 'mock',
            meta: { _id: pack._id, id: pack.id, title: pack.title }
        };
    }

    console.warn(`[findItem] ❌ No item found for "${itemId}" after all lookup attempts.`);
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — quick item look up specifically by courseId or string pack id
// ─────────────────────────────────────────────────────────────────────────────
async function getItemById(itemId) {
    const isObjectId = String(itemId).match(/^[0-9a-fA-F]{24}$/);
    
    // Try Course
    const c = await Course.findOne({
        $or: [
            { _id: isObjectId ? itemId : null },
            { slug: String(itemId).toLowerCase() },
            { title: String(itemId) }
        ]
    });
    if (c) return { _id: c._id, title: c.title, slug: c.slug };

    // Try Mock Pack
    const m = await MockTestPack.findOne({
        $or: [
            { _id: isObjectId ? itemId : null },
            { id: String(itemId) },
            { title: String(itemId) }
        ]
    });
    if (m) return { _id: m._id, title: m.title, id: m.id };

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — enroll user in course (shared by webhook + verifyPayment)
// ─────────────────────────────────────────────────────────────────────────────
async function enrollUser({ userId, courseId, paymentId, amount, orderId, courseTitle, itemMeta }) {
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

    // 2. User logic: Synchronize all possible identifiers for "Open-All-Doors" access
    const identifiers = new Set();
    identifiers.add(String(courseId)); // The ObjectId string usually
    if (courseTitle) identifiers.add(String(courseTitle));
    if (itemMeta) {
        if (itemMeta._id) identifiers.add(String(itemMeta._id));
        if (itemMeta.id) identifiers.add(String(itemMeta.id));
        if (itemMeta.slug) identifiers.add(String(itemMeta.slug));
        if (itemMeta.title) identifiers.add(String(itemMeta.title));
    }

    const idList = Array.from(identifiers).filter(id => id && id !== 'undefined' && id !== 'null');
    console.log(`[enrollUser] Synchronizing access for User ${userId} with IDs:`, idList);

    const updateData = {
        $addToSet: { 
            enrolledCourses: { $each: idList },
            purchasedCourses: { $each: idList }
        }
    };

    // Special check: Grant Master Series Access if this is the Master Pack
    const masterIds = ['state-board-master', 'State Board Master', 'state-board-master-paid'];
    const hasMasterMatch = idList.some(id => masterIds.includes(id));

    if (hasMasterMatch) {
        updateData.$set = { 
            hasMockSeriesAccess: true,
            purchasedMockTest: true 
        };
    }

    await User.findByIdAndUpdate(userId, updateData);

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

    // 5. Emit Real-time Dashboard Update
    if (global.io) {
        global.io.to(`user:${userId}`).emit('dashboard_update', {
            type: 'ENROLLMENT_SUCCESS',
            title: courseTitle,
            message: `Enrollment successful for ${courseTitle}! Welcome aboard.`
        });
    }
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

        const found = await findItem(courseId);
        if (!found) {
            console.warn(`[createOrder] Item not found for ID: ${courseId}`);
            return res.status(404).json({ ok: false, message: `Course or Mock Test not found: ${courseId}. Please check the ID.` });
        }
        
        const course = found.doc;
        const itemType = found.type;

        console.log(`[createOrder] Found ${itemType}: ${course.title} (Price: ₹${course.price})`);

        const isPaid = course.price > 0 && !course.isFree;
        if (!isPaid) {
            return res.status(400).json({ ok: false, message: 'This item is free — use the direct start button.' });
        }

        // Check if user is already enrolled (prevent duplicate purchases)
        const existing = await Enrollment.findOne({ userId, courseId: String(course._id) });
        if (existing) {
            return res.status(409).json({ ok: false, message: 'Already enrolled in this course.' });
        }

        // ── Safe User Lookup (Fixes CastError) ───────────────────
        async function findUserByIdOrEmail(uid) {
            if (String(uid).match(/^[0-9a-fA-F]{24}$/)) {
                return await User.findById(uid);
            }
            return await User.findOne({ email: String(uid) });
        }

        const user = await findUserByIdOrEmail(userId);
        
        // ── Email Sanitization ──
        let customerEmail = user?.email || 'user@coursenova.in';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) customerEmail = 'user@coursenova.in';

        // ── Name Sanitization (CF requires min 3 chars, max 50) ──
        let customerName = user?.name || 'Course User';
        customerName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (customerName.length < 3) customerName = 'Course User';
        customerName = customerName.slice(0, 50);
        
        // ── Phone Sanitization (Cashfree requires exactly 10 digits) ──
        let rawPhone = user?.phone || '9999999999';
        let customerPhone = rawPhone.replace(/\D/g, ''); 
        if (customerPhone.length < 10) customerPhone = '9999999999';
        else customerPhone = customerPhone.slice(-10); // Keep last 10 digits
        
        console.log(`[createOrder] Sanitized user info: ${customerName} | ${customerPhone} | ${customerEmail}`);

        // ── Generate unique order ID ─────────────────────────────
        const orderId = `coursenova_${String(userId).slice(-6)}_${Date.now()}`;

        const baseUrl = (sdkMode === 'production') 
            ? 'https://www.coursenova.in' 
            : (process.env.BASE_URL || 'http://localhost:5000');

        // return_url: redirect back to context with verify params
        let returnUrl = `${baseUrl}/course-content.html?course=${course._id}&payment=verify&order_id={order_id}`;
        if (itemType === 'mock') {
            const mockParam = course.id || course._id;
            returnUrl = `${baseUrl}/mock-tests.html?payment=verify&order_id={order_id}&pack_id=${mockParam}`;
        }

        // notify_url: Ensure Cashfree webhooks definitely reach our server
        const notifyUrl = (sdkMode === 'production')
            ? 'https://www.coursenova.in/api/cashfree/webhook'
            : `${baseUrl}/api/cashfree/webhook`;

        const orderMeta = { return_url: returnUrl, notify_url: notifyUrl };

        console.log(`[createOrder] Base: ${baseUrl} | returnUrl: ${returnUrl}`);

        const cfRequest = {
            order_amount:   Number(course.price),
            order_currency: 'INR',
            order_id:       orderId,
            customer_details: {
                customer_id:    String(userId).slice(0, 50),
                customer_email: customerEmail,
                customer_name:  customerName,
                customer_phone: customerPhone,
            },
            order_meta: orderMeta,
            order_note: `Course purchase - ${course.title}`,
        };

        console.log('[createOrder] Sending to Cashfree:', JSON.stringify(cfRequest, null, 2));

        let cfResponse;
        try {
            // Note: v5.1.0 handles the API version internally or via config. 
            // The method signature for PGCreateOrder typically only takes the request object.
            cfResponse = await cashfree.PGCreateOrder(cfRequest);
        } catch (cfErr) {
            const errData = cfErr.response?.data;
            const errMsg = errData?.message || errData?.error_detail || cfErr.message;
            const errCode = errData?.code || 'CF_ERROR';
            
            console.error(`[createOrder] ❌ Cashfree [${errCode}] Rejection:`, JSON.stringify(errData || cfErr.message, null, 2));
            
            return res.status(502).json({
                ok:      false,
                message: `Cashfree Error: ${errMsg}`, // Show specific error to user
                details: errMsg,
                code:    errCode
            });
        }

        const { payment_session_id } = cfResponse.data;

        // ── PERSIST ORDER IN DB (GROUND TRUTH) ───────────────────
        await CourseOrder.create({
            userId,
            courseId:         course._id,
            itemType:         itemType === 'mock' ? 'mock' : 'course', // Store item type
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
            courseId:          itemType === 'mock' ? course.id : course._id,
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

        // Check for idempotency — webhook may have already processed this
        const orderRecord = await CourseOrder.findOne({ orderId }).populate('userId');
        
        if (!orderRecord) {
            console.error(`[verifyPayment] Order not found in database: ${orderId}`);
            return res.status(404).json({ ok: false, message: `Order record is missing: ${orderId}` });
        }

        if (orderRecord.status === 'paid') {
            console.log(`[verifyPayment] 🎉 Order ${orderId} already marked as paid.`);
            return res.json({ ok: true, message: 'Payment successful', courseName: orderRecord.courseId?.title || 'Course' });
        }

        const actualCourseId = orderRecord.courseId;
        const itemMeta = await getItemById(actualCourseId);

        if (!itemMeta) {
            console.error(`[verifyPayment] Course data is missing for ID ${actualCourseId} in order ${orderId}`);
            return res.status(404).json({ ok: false, message: 'Purchased course data not found in catalog.' });
        }

        // ── Ask Cashfree for ground truth ────────────────────────
        let cfResponse;
        try {
            // v5.1.0 Fetch Order usage
            cfResponse = await cashfree.PGFetchOrder(orderId);
        } catch (cfErr) {
            console.error('[verifyPayment] Cashfree API error:', cfErr.response?.data || cfErr.message);
            return res.status(502).json({ ok: false, message: 'Unable to verify payment with Cashfree.' });
        }

        const payments = cfResponse.data;
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

        // Security: Ensure the order belongs to this user (extra guard)
        const orderOwnerId = String(orderRecord.userId._id || orderRecord.userId);
        if (orderOwnerId !== userId) {
            console.warn(`[verifyPayment] Security ALERT: User ${userId} tried to verify Order ${orderId} owned by ${orderOwnerId}`);
            return res.status(403).json({ ok: false, message: 'You do not have permission to verify this order.' });
        }

        // ── Update CourseOrder ───────────────────────────────────
        if (orderRecord) {
            orderRecord.status    = 'paid';
            orderRecord.paymentId = paymentId;
            orderRecord.processed = true;
            await orderRecord.save();
        }

        // ── Update legacy Payment record ─────────────────────────
        await Payment.findOneAndUpdate({ orderId }, { status: 'SUCCESS', paymentId });

        // ── ENROLL USER ──────────────────────────────────────────
        await enrollUser({
            userId,
            courseId:    actualCourseId,
            paymentId,
            amount:      paidAmount,
            orderId,
            courseTitle: itemMeta.title,
            itemMeta
        });

        console.log(`[verifyPayment] ✅ Verified & Enrolled: ${itemMeta.title} for user ${userId}`);

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${userId}`).emit('dashboard_update', {
                type: 'PURCHASE_COMPLETE',
                title: itemMeta.title,
                message: `Successfully unlocked ${itemMeta.title}!`
            });
        }

        return res.json({ ok: true, message: 'Payment verified successfully!', courseName: itemMeta.title });

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
        console.error(`[Webhook] ❌ INVALID SIGNATURE | ts=${timestamp} | sig=${signature?.slice(0, 10)}...`);
        // We log detailed headers to help debug production mismatches
        console.debug('[Webhook] Raw Payload Snippet:', rawBody.slice(0, 50));
        return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid signature.' });
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
            await handlePaymentSuccess({ orderRecord, orderId, paymentId, amount, payload, app: req.app });
        } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
            await handlePaymentFailed({ orderRecord, orderId, payload, app: req.app });
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
async function handlePaymentSuccess({ orderRecord, orderId, paymentId, amount, payload, app }) {
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

    // Fetch course or mock title for logs/activity
    const itemMeta = await getItemById(orderRecord.courseId);
    if (!itemMeta) {
        console.error(`[Webhook] Item ${orderRecord.courseId} not found! Cannot enroll.`);
        return;
    }

    // Enroll user — fully idempotent (upsert)
    await enrollUser({
        userId:      String(orderRecord.userId._id || orderRecord.userId),
        courseId:    orderRecord.courseId,
        paymentId,
        amount:      amount || orderRecord.amount,
        orderId,
        courseTitle: itemMeta.title,
        itemMeta
    });

    console.log(`[Webhook] 🎉 User ${orderRecord.userId} successfully enrolled in "${itemMeta.title}"`);

    // ── Real-time Dashboard Update ──
    if (app && app.get('io')) {
        const io = app.get('io');
        io.to(`user:${orderRecord.userId}`).emit('dashboard_update', {
            type: 'PURCHASE_COMPLETE',
            title: itemMeta.title,
            message: `Successfully unlocked ${itemMeta.title}!`
        });
    }
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
