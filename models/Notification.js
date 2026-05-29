const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    type: {
        type: String,
        enum: ['like', 'comment', 'answer', 'follow', 'announcement'],
        required: true
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // PostId or DoubtId
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
