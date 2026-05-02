const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String }, // From gateway
    itemType: { type: String, enum: ['course', 'mocktest', 'subscription'], required: true },
    itemId: { type: String }, // e.g. Course slug or "premium_monthly"
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
