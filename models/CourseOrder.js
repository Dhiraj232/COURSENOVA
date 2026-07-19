const mongoose = require('mongoose');

/**
 * CourseOrder — Tracks every payment attempt for a premium course.
 *
 * Lifecycle:
 *  pending  → order created, user sent to checkout
 *  paid     → Razorpay webhook confirmed SUCCESS, user enrolled
 *  failed   → Razorpay reported failure / webhook rejection
 */
const CourseOrderSchema = new mongoose.Schema(
    {
        // ── Core references ──────────────────────────────────────
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        /** Stores either Course ID or MockTestPack ID */
        courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
        itemType: { type: String, enum: ['course', 'mock'], default: 'course' },

        // ── Legacy identifiers (kept optional for backward compatibility) ──
        orderId: {
            type: String,
            index: true,
        },
        paymentId: { type: String, default: '' },
        paymentSessionId: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
            index: true,
        },

        // ── Razorpay identifiers ─────────────────────────────────
        razorpay_order_id: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        razorpay_payment_id: { type: String, default: '' },
        razorpay_signature: { type: String, default: '' },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
            index: true,
        },
        provider: { type: String, default: 'Razorpay' },

        // ── Monetary fields ──────────────────────────────────────
        amount:   { type: Number, required: true },
        currency: { type: String, default: 'INR' },

        // ── Failure context ──────────────────────────────────────
        failureReason: { type: String, default: '' },

        // ── Webhook / verification metadata ─────────────────────
        /** Set to true once webhook or verifyPayment has processed this order */
        processed: { type: Boolean, default: false },
        /** Raw event type received from webhook */
        webhookEvent: { type: String, default: '' },
        /** ISO timestamp when webhook was received */
        webhookReceivedAt: { type: Date },
    },
    {
        timestamps: true, // adds createdAt + updatedAt automatically
    }
);

// Compound index for fast "did this user buy this course?" queries
CourseOrderSchema.index({ userId: 1, courseId: 1 });

module.exports =
    mongoose.models.CourseOrder ||
    mongoose.model('CourseOrder', CourseOrderSchema);
