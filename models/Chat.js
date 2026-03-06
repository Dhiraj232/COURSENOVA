const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    conversationId: { type: String, unique: true, required: true },

    participants: {
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }
    },

    messages: [
        {
            senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            senderType: { type: String, enum: ['buyer', 'seller'] },
            message: String,
            attachments: [String], // URLs
            timestamp: { type: Date, default: Date.now },
            isRead: { type: Boolean, default: false }
        }
    ],

    lastMessage: String,
    lastMessageTime: Date,

    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    closedAt: Date,
    closedReason: String,

    createdAt: { type: Date, default: Date.now }
});

// Indexes
ChatSchema.index({ 'participants.buyer': 1, 'participants.seller': 1 });
ChatSchema.index({ conversationId: 1 });

module.exports = mongoose.model('Chat', ChatSchema);
