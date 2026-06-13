const mongoose = require('mongoose');

/**
 * Unified Notification Schema
 * Supports all notification types: course alerts, reminders, payments, orders, broadcasts
 * Optimized with compound indexes for fast unread queries and user-specific fetching
 */
const notificationSchema = new mongoose.Schema({
    // ── Recipient ─────────────────────────────────────────────────────────────
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreUser',
        required: true,
        index: true
    },

    // ── Sender (optional — null for system notifications) ────────────────────
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', default: null },
    senderName: { type: String, default: 'CourseNova' },

    // ── Notification Content ──────────────────────────────────────────────────
    type: {
        type: String,
        enum: [
            'new_course',       // Admin published a new course
            'discount',         // Discount / coupon created
            'daily_challenge',  // Daily challenge reminder
            'mock_test',        // Mock test reminder
            'course_progress',  // Resume course reminder
            'certificate',      // Certificate earned
            'order_placed',     // Store order placed
            'order_confirmed',  // Order confirmed
            'order_shipped',    // Order shipped
            'order_delivered',  // Order delivered
            'order_cancelled',  // Order cancelled
            'order_refunded',   // Order refunded
            'payment_success',  // Payment successful
            'payment_failed',   // Payment failed
            'payment_pending',  // Payment pending
            'payment_refund',   // Refund processed
            'announcement',     // Admin broadcast to all/group
            'like',             // Community like
            'comment',          // Community comment
            'answer',           // Community answer
            'follow',           // Community follow
        ],
        required: true
    },

    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },

    // ── Action ───────────────────────────────────────────────────────────────
    actionUrl: { type: String, default: null },       // URL to navigate when clicked
    actionLabel: { type: String, default: 'View' },   // Button label
    imageUrl: { type: String, default: null },         // Optional thumbnail/icon

    // ── Metadata (flexible payload per type) ─────────────────────────────────
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    // e.g. { courseId, couponCode, orderId, discountPercent, expiryDate, streak }

    // ── Reference (community notifications) ──────────────────────────────────
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // ── State ────────────────────────────────────────────────────────────────
    isRead: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false }, // Soft delete

    // ── Delivery Tracking ────────────────────────────────────────────────────
    pushSent: { type: Boolean, default: false },
    pushDelivered: { type: Boolean, default: false },
    openedAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },

    // ── Scheduling ───────────────────────────────────────────────────────────
    scheduledFor: { type: Date, default: null }, // null = send immediately
    expiresAt: { type: Date, default: null },    // Auto-hide after this date

    // ── Deduplication ────────────────────────────────────────────────────────
    dedupeKey: { type: String, default: null, index: true },
    // Pattern: `{type}:{recipientId}:{YYYY-MM-DD}` prevents duplicate daily reminders

    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// ── Compound Indexes for performance ─────────────────────────────────────────
notificationSchema.index({ recipientId: 1, isRead: 1, isDeleted: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-cleanup
notificationSchema.index({ dedupeKey: 1 }, { sparse: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
