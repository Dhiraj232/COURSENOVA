const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    courseId: { type: String, required: true },
    courseName: { type: String, default: '' },
    amount: { type: Number, default: 0 },

    // Cashfree fields
    orderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    paymentSessionId: { type: String, default: '' },

    // Legacy UPI / manual-verification fields
    utr: { type: String, default: '' },
    screenshot: { type: String, default: '' },

    // 'cashfree' | 'upi_manual'
    paymentMethod: { type: String, default: 'cashfree' },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'pending', 'approved', 'rejected'], // Keep legacy statuses for backward compat
        default: 'PENDING'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
