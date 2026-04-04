const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentId: { type: String, required: true }, // Payment ID
    orderId: { type: String, required: true },   // Order ID
    status: { type: String, enum: ['success', 'failed', 'refunded'], default: 'success' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
