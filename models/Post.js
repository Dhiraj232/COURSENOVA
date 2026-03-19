const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    userPicture: { type: String },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
        type: String, // Kept as simple String to avoid validation crash if an unknown category is used
        default: 'Programming'
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
