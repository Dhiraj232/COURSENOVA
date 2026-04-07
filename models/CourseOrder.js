const mongoose = require('mongoose');

/**
 * CourseOrder — Tracks every payment attempt for a premium course.
 *
 * Lifecycle:
 *  pending  → order created, user sent to checkout
 *  paid     → Cashfree webhook confirmed SUCCESS, user enrolled
 *  failed   → Cashfree reported failure / webhook rejection
 */
const CourseOrderSchema = new mongoose.Schema(
    {
        // ── Core references ──────────────────────────────────────
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        /** Stores either Course ID or MockTestPack ID */
        courseId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        itemType: { type: String, enum: ['course', 'mock'], default: 'course' },

        // ── Cashfree identifiers ─────────────────────────────────
        /** The order_id we generate and pass to Cashfree (order_<userId>_<ts>) */
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        /** cf_payment_id returned by Cashfree on success */
        paymentId: { type: String, default: '' },
        /** payment_session_id used to launch the Cashfree JS SDK */
        paymentSessionId: { type: String, default: '' },

        // ── Monetary fields ──────────────────────────────────────
        amount:   { type: Number, required: true },
        currency: { type: String, default: 'INR' },

        // ── Status ───────────────────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
            index: true,
        },

        // ── Failure context ──────────────────────────────────────
        failureReason: { type: String, default: '' },

        // ── Webhook / verification metadata ─────────────────────
        /** Set to true once webhook or verifyPayment has processed this order */
        processed: { type: Boolean, default: false },
        /** Raw event type received from Cashfree webhook */
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
