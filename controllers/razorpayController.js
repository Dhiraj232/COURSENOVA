'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');
const razorpayService = require('../services/razorpayService');

// ── Models ───────────────────────────────────────────────────────────────────
const CourseOrder  = require('../models/CourseOrder');
const Payment      = require('../models/Payment');      // legacy — kept for admin panel
const Enrollment   = require('../models/Enrollment');
const Course       = require('../models/Course');
const User         = require('../models/User');
const Transaction  = require('../models/Transaction');
const Activity     = require('../models/Activity');
const MockTestPack = require('../models/MockTestPack');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * HELPER — find course or mock test (flexible input)
 */
async function findItem(itemId) {
    logger.info(`[findItem] Searching for item with input: "${itemId}"`);
    
    // 1. Try by MongoDB ObjectId
    if (String(itemId).match(/^[0-9a-fA-F]{24}$/)) {
        const byId = await Course.findById(itemId);
        if (byId) {
            logger.info(`[findItem] ✅ Found course by ObjectId: ${byId.title}`);
            return { doc: byId, type: 'course' };
        }
        const testById = await MockTestPack.findById(itemId);
        if (testById) {
            logger.info(`[findItem] ✅ Found mock pack by ObjectId: ${testById.title}`);
            return { doc: testById, type: 'mock' };
        }
    }

    const escapedTitle = String(itemId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRegex = new RegExp(`^${escapedTitle}$`, 'i');
    
    // Check Courses
    const course = await Course.findOne({ 
        $or: [
            { _id: String(itemId).match(/^[0-9a-fA-F]{24}$/) ? itemId : null },
            { slug: String(itemId).toLowerCase().trim() },
            { slug: String(itemId).toLowerCase().replace(/-/g, ' ').trim() },
            { slug: String(itemId).toLowerCase().replace(/\s+/g, '-').trim() },
            { title: { $regex: titleRegex } }
        ].filter(q => q._id !== null || q.slug || q.title)
    });
    if (course) {
        logger.info(`[findItem] ✅ Found course: ${course.title}`);
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
        logger.info(`[findItem] ✅ Found mock pack: ${pack.title}`);
        return { 
            doc: pack, 
            type: 'mock',
            meta: { _id: pack._id, id: pack.id, title: pack.title }
        };
    }

    logger.warn(`[findItem] ❌ No item found for "${itemId}" after all lookup attempts.`);
    return null;
}

/**
 * HELPER — quick item look up specifically by courseId or string pack id
 */
async function getItemById(itemId) {
    const isObjectId = String(itemId).match(/^[0-9a-fA-F]{24}$/);
    
    // Try Course
    const c = await Course.findOne({
        $or: [
            { _id: isObjectId ? itemId : null },
            { slug: String(itemId).toLowerCase().trim() },
            { slug: String(itemId).toLowerCase().replace(/-/g, ' ').trim() },
            { slug: String(itemId).toLowerCase().replace(/\s+/g, '-').trim() },
            { title: String(itemId) }
        ].filter(q => q._id !== null || q.slug || q.title)
    });
    if (c) return { _id: c._id, title: c.title, slug: c.slug, type: 'course' };

    // Try Mock Pack
    const m = await MockTestPack.findOne({
        $or: [
            { _id: isObjectId ? itemId : null },
            { id: String(itemId) },
            { title: String(itemId) }
        ]
    });
    if (m) return { _id: m._id, title: m.title, id: m.id, type: 'mock' };

    return null;
}

/**
 * HELPER — enroll user in course (shared by webhook + verifyPayment)
 */
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
    logger.info(`[enrollUser] Synchronizing access for User ${userId} with IDs:`, idList);

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

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    // Send purchase email notification
    if (user && user.email) {
        try {
            const emailService = require('../services/emailService');
            await emailService.sendPurchaseEmail(user, {
                title: courseTitle,
                price: amount,
                orderId: orderId,
                type: (itemMeta && itemMeta.type === 'mock') ? 'Mock Test' : 'Course'
            });
            logger.info(`[enrollUser] ✅ Purchase email sent to ${user.email} for ${courseTitle}`);
        } catch (emailErr) {
            logger.error('[enrollUser] ❌ Failed to send purchase email:', emailErr.message);
        }
    }

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
        logger.warn('[enrollUser] Transaction log skipped:', e.message);
    }

    // 4. Activity log (non-fatal)
    try {
        await Activity.create({
            userId,
            type:        'course_enrolled',
            title:       `Enrolled: ${courseTitle}`,
            description: `Purchased premium course "${courseTitle}" via Razorpay.`,
            courseId:    String(courseId),
            courseName:  courseTitle,
        });
    } catch (e) {
        logger.warn('[enrollUser] Activity log skipped:', e.message);
    }

    logger.info(`✅ [enrollUser] User ${userId} enrolled in course ${courseId} | paymentId: ${paymentId}`);

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
// 1. GET PUBLIC CONFIG
//    GET /api/razorpay/config
// ═════════════════════════════════════════════════════════════════════════════
exports.getRPConfig = (req, res) => {
    res.json({ ok: true, keyId: process.env.RAZORPAY_KEY_ID });
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. CREATE ORDER
//    POST /api/razorpay/create-order
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
            logger.warn(`[createOrder] Item not found for ID: ${courseId}`);
            return res.status(404).json({ ok: false, message: `Course or Mock Test not found: ${courseId}. Please check the ID.` });
        }
        
        const course = found.doc;
        const itemType = found.type;

        logger.info(`[createOrder] Found ${itemType}: ${course.title} (Price: ₹${course.price})`);

        const isPaid = course.price > 0 && !course.isFree;
        if (!isPaid) {
            return res.status(400).json({ ok: false, message: 'This item is free — use the direct start button.' });
        }

        // Check if user is already enrolled (prevent duplicate purchases)
        const existing = await Enrollment.findOne({ userId, courseId: String(course._id) });
        if (existing) {
            return res.status(409).json({ ok: false, message: 'Already enrolled in this course.' });
        }

        // Safe User Lookup
        async function findUserByIdOrEmail(uid) {
            if (String(uid).match(/^[0-9a-fA-F]{24}$/)) {
                return await User.findById(uid);
            }
            return await User.findOne({ email: String(uid) });
        }

        const user = await findUserByIdOrEmail(userId);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User account not found.' });
        }
        
        // Email Sanitization
        let customerEmail = user.email || 'user@coursenova.in';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) customerEmail = 'user@coursenova.in';

        // Name Sanitization (must be standard characters)
        let customerName = user.name || 'Course User';
        customerName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (customerName.length < 3) customerName = 'Course User';
        customerName = customerName.slice(0, 50);
        
        // Phone Sanitization (digits only, limit to 10)
        let rawPhone = user.phone || '9999999999';
        let customerPhone = rawPhone.replace(/\D/g, ''); 
        if (customerPhone.length < 10) customerPhone = '9999999999';
        else customerPhone = customerPhone.slice(-10); // Keep last 10 digits
        
        logger.info(`[createOrder] Sanitized user info: ${customerName} | ${customerPhone} | ${customerEmail}`);

        // Custom receipt order ID
        const customOrderId = `coursenova_${String(userId).slice(-6)}_${Date.now()}`;

        // Create Razorpay Order via SDK
        let razorpayOrder;
        try {
            razorpayOrder = await razorpayService.createOrder(course.price, customOrderId, {
                userId: String(userId),
                courseId: String(course._id),
                itemType: itemType,
                courseTitle: course.title
            });
        } catch (rzpErr) {
            logger.error(`[createOrder] ❌ Razorpay Order creation failed:`, rzpErr.message);
            return res.status(500).json({ ok: false, message: 'Payment gateway initialization failed.' });
        }

        const { id: razorpayOrderId, amount: amountInPaise } = razorpayOrder;

        // PERSIST ORDER IN DB
        await CourseOrder.create({
            userId,
            courseId:          course._id,
            itemType:          itemType === 'mock' ? 'mock' : 'course',
            razorpay_order_id: razorpayOrderId,
            orderId:           razorpayOrderId, // Fallback to satisfy DB unique index orderId_1
            amount:            course.price,
            paymentStatus:     'pending',
            provider:          'Razorpay'
        });

        // Write to legacy Payment model (admin panel compatibility)
        try {
            await Payment.create({
                userId,
                itemId:           String(course._id),
                itemType:         itemType === 'mock' ? 'mocktest' : 'course',
                amount:           course.price,
                orderId:          razorpayOrderId,
                status:           'pending'
            });
        } catch (e) {
            logger.warn('[createOrder] Legacy Payment record skipped:', e.message);
        }

        logger.info(`[createOrder] ✅ Order ${razorpayOrderId} created — ₹${course.price} | course: ${course.title}`);

        return res.json({
            ok:                  true,
            success:             true,
            razorpay_order_id:   razorpayOrderId,
            amount:              amountInPaise,
            currency:            'INR',
            keyId:               process.env.RAZORPAY_KEY_ID,
            prefill: {
                name:    customerName,
                email:   customerEmail,
                contact: customerPhone
            },
            courseTitle:         course.title,
            courseId:            itemType === 'mock' ? course.id : course._id,
        });

    } catch (error) {
        logger.error('[createOrder] Unexpected error:', error.message);
        return res.status(500).json({ ok: false, message: 'Failed to create order. Please try again.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. VERIFY PAYMENT (frontend checkout modal callback)
//    POST /api/razorpay/verify
//    Requires: JWT auth (requireAuth middleware)
// ═════════════════════════════════════════════════════════════════════════════
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = String(req.userId);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ ok: false, message: 'Missing payment signature components' });
        }

        // 1. Signature Verification formula
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            logger.error('❌ RAZORPAY_KEY_SECRET is not configured in .env');
            return res.status(500).json({ ok: false, message: 'Server configuration error' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            logger.error(`[verifyPayment] Signature mismatch. Generated: ${generatedSignature}, Received: ${razorpay_signature}`);
            return res.status(400).json({ ok: false, message: 'Invalid payment signature' });
        }

        // 2. Load order record from DB
        const orderRecord = await CourseOrder.findOne({ razorpay_order_id }).populate('userId');
        if (!orderRecord) {
            logger.error(`[verifyPayment] Order not found in database: ${razorpay_order_id}`);
            return res.status(404).json({ ok: false, message: 'Order record not found' });
        }

        // Security check: order belongs to requesting user
        const orderOwnerId = String(orderRecord.userId._id || orderRecord.userId);
        if (orderOwnerId !== userId) {
            logger.warn(`[verifyPayment] Security ALERT: User ${userId} tried to verify Order ${razorpay_order_id} owned by ${orderOwnerId}`);
            return res.status(403).json({ ok: false, message: 'You do not have permission to verify this order.' });
        }

        if (orderRecord.paymentStatus === 'paid') {
            logger.info(`[verifyPayment] Order ${razorpay_order_id} already processed.`);
            const itemMeta = await getItemById(orderRecord.courseId);
            return res.json({ ok: true, message: 'Payment verified successfully!', courseName: itemMeta?.title || 'Course' });
        }

        const actualCourseId = orderRecord.courseId;
        const itemMeta = await getItemById(actualCourseId);

        if (!itemMeta) {
            logger.error(`[verifyPayment] Course data is missing for ID ${actualCourseId} in order ${razorpay_order_id}`);
            return res.status(404).json({ ok: false, message: 'Purchased item data not found in catalog.' });
        }

        // Update CourseOrder record status
        orderRecord.paymentStatus       = 'paid';
        orderRecord.razorpay_payment_id = razorpay_payment_id;
        orderRecord.razorpay_signature  = razorpay_signature;
        orderRecord.processed           = true;
        await orderRecord.save();

        // Update legacy Payment record
        await Payment.findOneAndUpdate({ orderId: razorpay_order_id }, { status: 'success', paymentId: razorpay_payment_id });

        // ENROLL USER
        await enrollUser({
            userId,
            courseId:    actualCourseId,
            paymentId:   razorpay_payment_id,
            amount:      orderRecord.amount,
            orderId:     razorpay_order_id,
            courseTitle: itemMeta.title,
            itemMeta
        });

        logger.info(`[verifyPayment] ✅ Verified & Enrolled: ${itemMeta.title} for user ${userId}`);

        // Emit real-time dashboard update
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
        logger.error('[verifyPayment] Unexpected verification error:', error.message);
        return res.status(500).json({ ok: false, message: 'Payment verification failed.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. WEBHOOK HANDLER
//    POST /api/razorpay/webhook
//    PUBLIC — Called by Razorpay servers (no JWT auth)
//    Protected by verifyRazorpaySignature middleware
// ═════════════════════════════════════════════════════════════════════════════
exports.webhookHandler = async (req, res) => {
    let payload;
    try {
        payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    } catch (parseErr) {
        logger.error('[Webhook] Failed to parse JSON body:', parseErr.message);
        return res.status(400).json({ ok: false, message: 'Invalid JSON body.' });
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;
    const amountInPaise = paymentEntity?.amount || orderEntity?.amount || 0;
    const amount = amountInPaise / 100;

    logger.info(`[Webhook] 📩 Event: ${event} | Order: ${razorpayOrderId} | Payment: ${razorpayPaymentId}`);

    if (!razorpayOrderId) {
        logger.warn('[Webhook] No order ID found in webhook payload. Ignoring.');
        return res.status(200).json({ ok: true, message: 'Ignored: No Order ID' });
    }

    try {
        const orderRecord = await CourseOrder.findOne({ razorpay_order_id: razorpayOrderId });

        // Idempotency: skip if already processed for payment success events
        if ((event === 'order.paid' || event === 'payment.captured') && orderRecord && orderRecord.processed) {
            logger.info(`[Webhook] Order ${razorpayOrderId} already processed. Skipping webhook handling.`);
            return res.status(200).json({ ok: true, message: 'Already processed' });
        }

        if (event === 'order.paid' || event === 'payment.captured') {
            if (!orderRecord) {
                logger.warn(`[Webhook] No matching CourseOrder found for order: ${razorpayOrderId}`);
                // Update legacy Payment collection if it exists
                await Payment.findOneAndUpdate({ orderId: razorpayOrderId }, { status: 'success', paymentId: razorpayPaymentId });
                return res.status(200).json({ ok: true });
            }

            const itemMeta = await getItemById(orderRecord.courseId);
            if (!itemMeta) {
                logger.error(`[Webhook] Item ${orderRecord.courseId} not found! Cannot enroll.`);
                return res.status(200).json({ ok: false, message: 'Item metadata not found' });
            }

            // Update order status in DB
            orderRecord.paymentStatus       = 'paid';
            orderRecord.razorpay_payment_id = razorpayPaymentId || orderRecord.razorpay_payment_id;
            orderRecord.processed           = true;
            orderRecord.webhookEvent        = event;
            orderRecord.webhookReceivedAt   = new Date();
            await orderRecord.save();

            // Update legacy Payment record
            await Payment.findOneAndUpdate({ orderId: razorpayOrderId }, { status: 'success', paymentId: razorpayPaymentId });

            // Enroll User
            await enrollUser({
                userId:      String(orderRecord.userId),
                courseId:    orderRecord.courseId,
                paymentId:   razorpayPaymentId || 'webhook_captured',
                amount:      amount || orderRecord.amount,
                orderId:     razorpayOrderId,
                courseTitle: itemMeta.title,
                itemMeta
            });

            logger.info(`[Webhook] Successfully processed enrollment for order: ${razorpayOrderId}`);

            // Emit real-time dashboard update
            if (req.app && req.app.get('io')) {
                const io = req.app.get('io');
                io.to(`user:${orderRecord.userId}`).emit('dashboard_update', {
                    type: 'PURCHASE_COMPLETE',
                    title: itemMeta.title,
                    message: `Successfully unlocked ${itemMeta.title}!`
                });
            }

        } else if (event === 'payment.failed') {
            if (orderRecord) {
                const failReason = paymentEntity?.error_description || 'Payment failed';
                orderRecord.paymentStatus     = 'failed';
                orderRecord.failureReason    = failReason;
                orderRecord.processed        = true;
                orderRecord.webhookEvent     = event;
                orderRecord.webhookReceivedAt = new Date();
                await orderRecord.save();
            }

            await Payment.findOneAndUpdate({ orderId: razorpayOrderId }, { status: 'failed' });
            logger.info(`[Webhook] Logged payment failure for order: ${razorpayOrderId}`);

        } else if (event === 'refund.created') {
            if (orderRecord) {
                orderRecord.paymentStatus     = 'failed'; // CourseOrder schema status uses enum: ['pending', 'paid', 'failed']
                orderRecord.failureReason    = 'Payment refunded';
                orderRecord.webhookEvent     = event;
                orderRecord.webhookReceivedAt = new Date();
                await orderRecord.save();

                // Update Transaction record (non-fatal)
                try {
                    await Transaction.findOneAndUpdate(
                        { orderId: razorpayOrderId },
                        { status: 'refunded' }
                    );
                } catch (txErr) {
                    logger.warn('[Webhook] Transaction update failed on refund:', txErr.message);
                }
            }

            await Payment.findOneAndUpdate({ orderId: razorpayOrderId }, { status: 'failed' });
            logger.info(`[Webhook] Logged refund event for order: ${razorpayOrderId}`);

        } else if (event === 'payment.authorized') {
            logger.info(`[Webhook] Payment authorized for order: ${razorpayOrderId} — waiting for capture.`);
        } else {
            logger.info(`[Webhook] Unhandled event: ${event}`);
        }

        return res.status(200).json({ ok: true });

    } catch (err) {
        logger.error(`[Webhook] Error executing handler for event ${event}:`, err.message);
        return res.status(500).json({ ok: false, message: 'Processing error logged.' });
    }
};
