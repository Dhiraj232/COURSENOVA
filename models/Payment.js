const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
<<<<<<< HEAD
    name: { type: String, required: true },
    email: { type: String, required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    utr: { type: String, required: true },
    screenshot: { type: String, required: true },   // path to uploaded file
=======
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

>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
