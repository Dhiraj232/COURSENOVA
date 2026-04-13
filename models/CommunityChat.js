const mongoose = require('mongoose');

const communityChatSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true }, // e.g., 'JEE', 'NEET', or 'userId1_userId2'
    type: { type: String, enum: ['group', 'personal'], default: 'group' },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        senderName: { type: String },
        senderPicture: { type: String },
        text: { type: String, required: true },
        image: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    lastMessage: { type: String },
    lastMessageTime: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('CommunityChat', communityChatSchema);
