const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    courseId: { type: String, required: true },
    courseName: { type: String, default: '' },
    amount: { type: Number, default: 0 },

    // Razorpay online payment fields
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },

    // Legacy UPI / manual-verification fields (kept for backward compat)
    utr: { type: String, default: '' },
    screenshot: { type: String, default: '' },

    // 'razorpay' | 'upi_manual'
    paymentMethod: { type: String, default: 'razorpay' },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
