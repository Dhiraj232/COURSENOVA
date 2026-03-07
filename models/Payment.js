const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    utr: { type: String, required: true },
    screenshot: { type: String, required: true },   // path to uploaded file
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
