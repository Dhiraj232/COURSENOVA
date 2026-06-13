/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           COURSENOVA — NOTIFICATION SERVICE                          ║
 * ║  Central service for all notification delivery across the platform.  ║
 * ║  Handles: DB persistence, Socket.io real-time, Web Push (VAPID)      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const webpush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

// ── Configure Web Push VAPID ──────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:coursenova.in@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push VAPID configured');
} else {
    console.warn('⚠️ VAPID keys missing — browser push notifications disabled');
}

// ── Notification Icons by type ────────────────────────────────────────────────
const TYPE_ICONS = {
    new_course: '🎓',
    discount: '🏷️',
    daily_challenge: '🔥',
    mock_test: '📝',
    course_progress: '📚',
    certificate: '🏆',
    order_placed: '🛍️',
    order_confirmed: '✅',
    order_shipped: '📦',
    order_delivered: '🎉',
    order_cancelled: '❌',
    order_refunded: '💰',
    payment_success: '✅',
    payment_failed: '❌',
    payment_pending: '⏳',
    payment_refund: '💰',
    announcement: '📢',
    like: '❤️',
    comment: '💬',
    answer: '💡',
    follow: '👤'
};

// ── DEDUPLICATION KEY HELPERS ─────────────────────────────────────────────────

/**
 * Build a deduplication key to prevent sending the same notification twice per day
 * @param {string} type - Notification type
 * @param {string} recipientId - User ObjectId
 * @param {string} [suffix] - Optional extra identifier (e.g. orderId)
 */
function buildDedupeKey(type, recipientId, suffix = '') {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${type}:${recipientId}:${today}${suffix ? ':' + suffix : ''}`;
}

/**
 * Check if a duplicate notification already exists
 */
async function isDuplicate(dedupeKey) {
    if (!dedupeKey) return false;
    const existing = await Notification.findOne({ dedupeKey }).lean();
    return !!existing;
}

// ── CORE: CREATE + DELIVER ONE NOTIFICATION ───────────────────────────────────

/**
 * Create and deliver a single notification to one user.
 * @param {object} opts
 * @param {string} opts.recipientId - Target user ObjectId
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.actionUrl]
 * @param {string} [opts.actionLabel]
 * @param {string} [opts.imageUrl]
 * @param {object} [opts.meta]
 * @param {string} [opts.dedupeKey]
 * @param {Date}   [opts.expiresAt]
 * @param {boolean} [opts.checkDedupe=true]
 * @returns {object|null} Created notification or null if deduplicated
 */
async function sendToUser(opts) {
    const {
        recipientId,
        type,
        title,
        message,
        actionUrl = null,
        actionLabel = 'View',
        imageUrl = null,
        meta = {},
        dedupeKey = null,
        expiresAt = null,
        checkDedupe = true
    } = opts;

    try {
        // 1. Deduplication check
        if (checkDedupe && dedupeKey && await isDuplicate(dedupeKey)) {
            return null; // Skip — already sent today
        }

        // 2. Check user preferences
        const user = await User.findById(recipientId).select('notificationPreferences').lean();
        if (!user) return null;

        const prefs = user.notificationPreferences || {};

        // Type-to-preference map
        const prefMap = {
            new_course: 'newCourses',
            discount: 'discounts',
            daily_challenge: 'dailyChallenge',
            mock_test: 'mockTest',
            course_progress: 'courseProgress',
            certificate: 'inApp',
            order_placed: 'orderUpdates',
            order_confirmed: 'orderUpdates',
            order_shipped: 'orderUpdates',
            order_delivered: 'orderUpdates',
            order_cancelled: 'orderUpdates',
            order_refunded: 'orderUpdates',
            payment_success: 'inApp',
            payment_failed: 'inApp',
            payment_pending: 'inApp',
            payment_refund: 'inApp',
            announcement: 'announcements',
            like: 'inApp',
            comment: 'inApp',
            answer: 'inApp',
            follow: 'inApp'
        };

        const prefKey = prefMap[type] || 'inApp';
        if (prefs[prefKey] === false) return null; // User opted out

        // 3. Save to DB
        const notification = await Notification.create({
            recipientId,
            type,
            title,
            message,
            actionUrl,
            actionLabel,
            imageUrl,
            meta,
            dedupeKey,
            expiresAt
        });

        // 4. Real-time delivery via Socket.io
        deliverViaSocket(recipientId, notification);

        // 5. Web Push (async, non-blocking)
        if (prefs.push !== false) {
            sendPushToUser(recipientId, {
                title,
                body: message,
                icon: '/images/coursenova-logo.png',
                badge: '/images/coursenova-logo.png',
                data: { url: actionUrl || '/', notificationId: notification._id.toString() },
                tag: type // Groups same-type notifications on device
            }).then(() => {
                Notification.updateOne({ _id: notification._id }, { pushSent: true }).exec();
            }).catch(() => {}); // Non-blocking — never fail the request
        }

        return notification;
    } catch (err) {
        console.error(`[NotificationService] sendToUser error (${type}):`, err.message);
        return null;
    }
}

// ── BATCH SEND ────────────────────────────────────────────────────────────────

/**
 * Send the same notification to multiple users (batch, non-blocking)
 * Processes in chunks of 50 to avoid DB overload
 * @param {string[]} recipientIds - Array of user ObjectIds
 * @param {object} opts - Same opts as sendToUser (without recipientId)
 * @returns {object} { sent, skipped, failed }
 */
async function sendToMany(recipientIds, opts) {
    const CHUNK_SIZE = 50;
    let sent = 0, skipped = 0, failed = 0;

    for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
        const chunk = recipientIds.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
            chunk.map(id => sendToUser({ ...opts, recipientId: id,
                dedupeKey: opts.dedupeKey ? buildDedupeKey(opts.type, id, opts.dedupeKey) : null
            }))
        );

        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) sent++;
            else if (r.status === 'fulfilled' && !r.value) skipped++;
            else failed++;
        });

        // Small delay between chunks to avoid DB overload
        if (i + CHUNK_SIZE < recipientIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`[NotificationService] Batch complete — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`);
    return { sent, skipped, failed };
}

// ── SOCKET.IO DELIVERY ────────────────────────────────────────────────────────

function deliverViaSocket(recipientId, notification) {
    try {
        const io = global.io;
        if (!io) return;
        io.to(`user:${recipientId}`).emit('notification:new', {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.actionUrl,
            actionLabel: notification.actionLabel,
            imageUrl: notification.imageUrl,
            icon: TYPE_ICONS[notification.type] || '🔔',
            isRead: false,
            createdAt: notification.createdAt
        });
    } catch (err) {
        // Non-fatal — socket delivery failure doesn't block the flow
    }
}

// ── WEB PUSH DELIVERY ─────────────────────────────────────────────────────────

/**
 * Send browser push notification to all active subscriptions of a user
 * Retries up to 3 times on transient failure
 * Deactivates subscription on 410 Gone (browser unsubscribed)
 */
async function sendPushToUser(userId, payload, retries = 3) {
    if (!VAPID_PUBLIC_KEY) return;

    const subs = await PushSubscription.find({ userId, isActive: true }).lean();
    if (!subs.length) return;

    const payloadStr = JSON.stringify(payload);

    await Promise.allSettled(subs.map(async (sub) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    payloadStr,
                    { TTL: 86400 } // 24h time-to-live
                );
                await PushSubscription.updateOne({ _id: sub._id }, { lastUsed: new Date(), failCount: 0 });
                return; // Success
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired/invalid — deactivate immediately
                    await PushSubscription.updateOne({ _id: sub._id }, { isActive: false });
                    return;
                }
                if (attempt === retries) {
                    await PushSubscription.updateOne({ _id: sub._id }, { $inc: { failCount: 1 } });
                } else {
                    // Wait before retry (exponential backoff: 500ms, 1s, 2s)
                    await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
                }
            }
        }
    }));
}

// ── HIGH-LEVEL NOTIFICATION TRIGGERS ─────────────────────────────────────────

/**
 * Notify all opted-in users about a new course
 */
async function notifyNewCourse(course) {
    try {
        const users = await User.find(
            { 'notificationPreferences.newCourses': { $ne: false } },
            '_id'
        ).lean();

        const ids = users.map(u => u._id.toString());
        return sendToMany(ids, {
            type: 'new_course',
            title: `New Course Available: ${course.title}`,
            message: `📚 ${course.category || 'New'} course "${course.title}" is now live! Start learning today.`,
            actionUrl: `/certificates`,
            actionLabel: 'View Course',
            imageUrl: course.thumbnail || null,
            meta: { courseId: course._id, courseTitle: course.title, category: course.category },
            dedupeKey: `new_course:${course._id}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
    } catch (err) {
        console.error('[NotificationService] notifyNewCourse error:', err.message);
    }
}

/**
 * Notify all opted-in users about a discount/coupon
 */
async function notifyDiscount({ title, message, couponCode, discountPercent, expiryDate, actionUrl }) {
    try {
        const users = await User.find(
            { 'notificationPreferences.discounts': { $ne: false } },
            '_id'
        ).lean();

        const ids = users.map(u => u._id.toString());
        return sendToMany(ids, {
            type: 'discount',
            title: title || `🏷️ Special Discount: ${discountPercent}% Off!`,
            message: message || `Use code ${couponCode} before ${expiryDate}. Don't miss out!`,
            actionUrl: actionUrl || '/certificates',
            actionLabel: 'Claim Offer',
            meta: { couponCode, discountPercent, expiryDate },
            dedupeKey: couponCode || 'discount',
            expiresAt: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
    } catch (err) {
        console.error('[NotificationService] notifyDiscount error:', err.message);
    }
}

/**
 * Notify a single user about certificate availability
 */
async function notifyCertificate(userId, courseName, certId) {
    return sendToUser({
        recipientId: userId,
        type: 'certificate',
        title: '🏆 Certificate Earned!',
        message: `Congratulations! Your certificate for "${courseName}" is ready to download.`,
        actionUrl: `/my-certificates`,
        actionLabel: 'Download Certificate',
        meta: { courseName, certId },
        checkDedupe: false
    });
}

/**
 * Notify a user about order status changes
 */
async function notifyOrder(userId, orderId, status, orderDetails = {}) {
    const statusMessages = {
        order_placed: { title: '🛍️ Order Placed!', msg: `Your order #${orderId} has been placed successfully.` },
        order_confirmed: { title: '✅ Order Confirmed!', msg: `Order #${orderId} has been confirmed and is being prepared.` },
        order_shipped: { title: '📦 Order Shipped!', msg: `Order #${orderId} is on its way to you!` },
        order_delivered: { title: '🎉 Order Delivered!', msg: `Order #${orderId} has been delivered. Enjoy your purchase!` },
        order_cancelled: { title: '❌ Order Cancelled', msg: `Order #${orderId} has been cancelled. Refund will be processed shortly.` },
        order_refunded: { title: '💰 Refund Processed', msg: `Refund for order #${orderId} has been processed successfully.` }
    };

    const info = statusMessages[status] || { title: 'Order Update', msg: `Your order #${orderId} status has been updated.` };

    return sendToUser({
        recipientId: userId,
        type: status,
        title: info.title,
        message: info.msg,
        actionUrl: '/orders',
        actionLabel: 'View Order',
        meta: { orderId, ...orderDetails },
        checkDedupe: false
    });
}

/**
 * Notify a user about payment status
 */
async function notifyPayment(userId, status, amount, courseTitle) {
    const statusMap = {
        payment_success: { title: '✅ Payment Successful!', msg: `₹${amount} payment for "${courseTitle}" was successful. Enjoy your course!` },
        payment_failed: { title: '❌ Payment Failed', msg: `Your payment of ₹${amount} for "${courseTitle}" failed. Please try again.` },
        payment_pending: { title: '⏳ Payment Pending', msg: `Your payment of ₹${amount} for "${courseTitle}" is being processed.` },
        payment_refund: { title: '💰 Refund Initiated', msg: `Refund of ₹${amount} for "${courseTitle}" has been initiated.` }
    };

    const info = statusMap[status] || { title: 'Payment Update', msg: `Payment status updated for "${courseTitle}".` };

    return sendToUser({
        recipientId: userId,
        type: status,
        title: info.title,
        message: info.msg,
        actionUrl: '/dashboard',
        actionLabel: 'View Dashboard',
        meta: { amount, courseTitle },
        checkDedupe: false
    });
}

/**
 * Admin broadcast to all or specific users
 */
async function broadcastAnnouncement({ title, message, targetUserIds, actionUrl, actionLabel, imageUrl, scheduleFor }) {
    try {
        let ids;
        if (targetUserIds && targetUserIds.length > 0) {
            ids = targetUserIds.map(String);
        } else {
            const users = await User.find(
                { 'notificationPreferences.announcements': { $ne: false } },
                '_id'
            ).lean();
            ids = users.map(u => u._id.toString());
        }

        return sendToMany(ids, {
            type: 'announcement',
            title,
            message,
            actionUrl: actionUrl || '/',
            actionLabel: actionLabel || 'View',
            imageUrl: imageUrl || null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
    } catch (err) {
        console.error('[NotificationService] broadcastAnnouncement error:', err.message);
    }
}

// ── DAILY REMINDER TRIGGERS (called by schedulerService) ─────────────────────

/**
 * Send daily challenge reminders to users who haven't completed today's challenge
 */
async function sendDailyChallengeReminders() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        // Find users who haven't been reminded today and prefer reminders
        const users = await User.find({
            'notificationPreferences.dailyChallenge': { $ne: false },
            $or: [
                { lastChallengeDate: { $ne: today } },
                { lastChallengeDate: null }
            ]
        }, '_id streak').lean();

        if (!users.length) return;

        const ids = users.map(u => u._id.toString());
        const streakMap = {};
        users.forEach(u => { streakMap[u._id.toString()] = u.streak || 0; });

        // Send individually so we can personalize the streak count
        await Promise.allSettled(ids.map(id => sendToUser({
            recipientId: id,
            type: 'daily_challenge',
            title: '🔥 Daily Challenge Waiting!',
            message: streakMap[id] > 0
                ? `You're on a ${streakMap[id]}-day streak! Keep it going — complete today's challenge now.`
                : `Today's challenge is live! 150 questions, 120 minutes. Can you top the leaderboard?`,
            actionUrl: '/daily-challenge',
            actionLabel: 'Start Challenge',
            meta: { streak: streakMap[id] },
            dedupeKey: buildDedupeKey('daily_challenge', id),
            expiresAt: new Date(new Date().setHours(23, 59, 59, 0))
        })));

        console.log(`[Scheduler] Daily challenge reminders sent to ${ids.length} users`);
    } catch (err) {
        console.error('[NotificationService] sendDailyChallengeReminders error:', err.message);
    }
}

/**
 * Send mock test reminders to users who haven't taken a test today
 */
async function sendMockTestReminders() {
    try {
        const users = await User.find(
            { 'notificationPreferences.mockTest': { $ne: false } },
            '_id'
        ).lean();

        if (!users.length) return;

        const ids = users.map(u => u._id.toString());
        await sendToMany(ids, {
            type: 'mock_test',
            title: '📝 Ready to Test Yourself?',
            message: "Boost your exam prep with a mock test today! Track your progress and find your weak areas.",
            actionUrl: '/mock-tests',
            actionLabel: 'Start Test',
            dedupeKey: 'mock_test_daily',
            expiresAt: new Date(new Date().setHours(23, 59, 59, 0))
        });

        console.log(`[Scheduler] Mock test reminders sent to ${ids.length} users`);
    } catch (err) {
        console.error('[NotificationService] sendMockTestReminders error:', err.message);
    }
}

/**
 * Send course progress reminders to users with stale progress (3+ days)
 */
async function sendCourseProgressReminders() {
    try {
        const CourseProgress = require('../models/CourseProgress');
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // Find users with incomplete courses and last access > 3 days ago
        const staleProgress = await CourseProgress.find({
            isCompleted: false,
            progressPercent: { $gt: 0, $lt: 100 },
            updatedAt: { $lt: threeDaysAgo }
        }).select('userId courseId courseName progressPercent').lean();

        if (!staleProgress.length) return;

        await Promise.allSettled(staleProgress.map(p => sendToUser({
            recipientId: p.userId,
            type: 'course_progress',
            title: '📚 Continue Where You Left Off',
            message: `You're ${p.progressPercent}% through "${p.courseName || 'your course'}". Don't lose your momentum — resume today!`,
            actionUrl: `/course-content?id=${p.courseId}`,
            actionLabel: 'Resume Course',
            meta: { courseId: p.courseId, courseName: p.courseName, progress: p.progressPercent },
            dedupeKey: buildDedupeKey('course_progress', p.userId, p.courseId),
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        })));

        console.log(`[Scheduler] Course progress reminders sent for ${staleProgress.length} stale enrollments`);
    } catch (err) {
        console.error('[NotificationService] sendCourseProgressReminders error:', err.message);
    }
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────
module.exports = {
    sendToUser,
    sendToMany,
    sendPushToUser,
    notifyNewCourse,
    notifyDiscount,
    notifyCertificate,
    notifyOrder,
    notifyPayment,
    broadcastAnnouncement,
    sendDailyChallengeReminders,
    sendMockTestReminders,
    sendCourseProgressReminders,
    buildDedupeKey,
    TYPE_ICONS,
    VAPID_PUBLIC_KEY
};
