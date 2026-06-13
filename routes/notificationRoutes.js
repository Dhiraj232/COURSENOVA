/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           COURSENOVA — NOTIFICATION ROUTES                           ║
 * ║  REST API for the user-facing notification center                    ║
 * ║  All routes require authentication (requireAuth middleware)           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { VAPID_PUBLIC_KEY } = require('../services/notificationService');

// All notification routes require authentication
router.use(requireAuth);

// ── GET /api/notifications/vapid-public-key ────────────────────────────────
// Returns the VAPID public key for browser push subscription setup
router.get('/vapid-public-key', (req, res) => {
    res.json({ ok: true, publicKey: VAPID_PUBLIC_KEY || null });
});

// ── GET /api/notifications ─────────────────────────────────────────────────
// List notifications with pagination, filter, and search
router.get('/', catchAsync(async (req, res) => {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {
        recipientId: userId,
        isDeleted: false
    };

    // Filter by type
    if (req.query.type && req.query.type !== 'all') {
        filter.type = req.query.type;
    }

    // Filter by read status
    if (req.query.unread === 'true') {
        filter.isRead = false;
    }

    // Search by title or message
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.slice(0, 100), 'i');
        filter.$or = [
            { title: searchRegex },
            { message: searchRegex }
        ];
    }

    const [notifications, total] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments(filter)
    ]);

    res.json({
        ok: true,
        notifications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + notifications.length < total
        }
    });
}));

// ── GET /api/notifications/unread-count ───────────────────────────────────
// Fast badge count query
router.get('/unread-count', catchAsync(async (req, res) => {
    const count = await Notification.countDocuments({
        recipientId: req.userId,
        isRead: false,
        isDeleted: false
    });
    res.json({ ok: true, count });
}));

// ── PUT /api/notifications/read-all ───────────────────────────────────────
// Mark all notifications as read
router.put('/read-all', catchAsync(async (req, res) => {
    await Notification.updateMany(
        { recipientId: req.userId, isRead: false, isDeleted: false },
        { $set: { isRead: true } }
    );
    res.json({ ok: true, message: 'All notifications marked as read' });
}));

// ── DELETE /api/notifications/clear-all ───────────────────────────────────
// Soft-delete all notifications for user
router.delete('/clear-all', catchAsync(async (req, res) => {
    await Notification.updateMany(
        { recipientId: req.userId, isDeleted: false },
        { $set: { isDeleted: true } }
    );
    res.json({ ok: true, message: 'All notifications cleared' });
}));

// ── GET /api/notifications/preferences ────────────────────────────────────
// Get user notification preferences
router.get('/preferences', catchAsync(async (req, res) => {
    const user = await User.findById(req.userId)
        .select('notificationPreferences')
        .lean();

    if (!user) throw new AppError('User not found', 404);

    const defaults = {
        push: true, inApp: true, dailyChallenge: true, mockTest: true,
        discounts: true, newCourses: true, orderUpdates: true,
        courseProgress: true, announcements: true
    };

    res.json({
        ok: true,
        preferences: { ...defaults, ...(user.notificationPreferences || {}) }
    });
}));

// ── PUT /api/notifications/preferences ────────────────────────────────────
// Update user notification preferences
router.put('/preferences', catchAsync(async (req, res) => {
    const allowed = ['push', 'inApp', 'dailyChallenge', 'mockTest', 'discounts', 'newCourses', 'orderUpdates', 'courseProgress', 'announcements'];
    const updates = {};

    allowed.forEach(key => {
        if (typeof req.body[key] === 'boolean') {
            updates[`notificationPreferences.${key}`] = req.body[key];
        }
    });

    await User.findByIdAndUpdate(req.userId, { $set: updates });
    res.json({ ok: true, message: 'Preferences saved' });
}));

// ── POST /api/notifications/push-subscribe ────────────────────────────────
// Save a Web Push subscription for this user/device
router.post('/push-subscribe', catchAsync(async (req, res) => {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw new AppError('Invalid push subscription object', 400);
    }

    const browser = detectBrowser(req.get('user-agent') || '');

    // Upsert: update if endpoint exists, create if new
    await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        {
            userId: req.userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: (req.get('user-agent') || '').slice(0, 300),
            browser,
            isActive: true,
            failCount: 0,
            lastUsed: new Date()
        },
        { upsert: true, new: true }
    );

    res.json({ ok: true, message: 'Push subscription saved' });
}));

// ── DELETE /api/notifications/push-unsubscribe ────────────────────────────
// Remove a Web Push subscription
router.delete('/push-unsubscribe', catchAsync(async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) throw new AppError('Endpoint required', 400);

    await PushSubscription.findOneAndUpdate(
        { endpoint, userId: req.userId },
        { isActive: false }
    );

    res.json({ ok: true, message: 'Unsubscribed from push notifications' });
}));

// ── PUT /api/notifications/:id/read ───────────────────────────────────────
// Mark a single notification as read + track open time
router.put('/:id/read', catchAsync(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipientId: req.userId },
        { $set: { isRead: true, openedAt: new Date() } },
        { new: true }
    );

    if (!notification) throw new AppError('Notification not found', 404);
    res.json({ ok: true, notification });
}));

// ── PUT /api/notifications/:id/click ──────────────────────────────────────
// Track click for analytics
router.put('/:id/click', catchAsync(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, recipientId: req.userId },
        { $set: { isRead: true, clickedAt: new Date(), openedAt: new Date() } }
    );
    res.json({ ok: true });
}));

// ── DELETE /api/notifications/:id ─────────────────────────────────────────
// Soft-delete one notification
router.delete('/:id', catchAsync(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipientId: req.userId },
        { $set: { isDeleted: true } }
    );

    if (!notification) throw new AppError('Notification not found', 404);
    res.json({ ok: true, message: 'Notification deleted' });
}));

// ── HELPER ────────────────────────────────────────────────────────────────
function detectBrowser(ua) {
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
    return 'Unknown';
}

module.exports = router;
