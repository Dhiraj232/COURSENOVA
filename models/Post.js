const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
<<<<<<< HEAD
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
=======
    userId: { type: String, required: true },
>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c
    username: { type: String, required: true },
    userPicture: { type: String },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
<<<<<<< HEAD
        type: String,
        enum: ['Programming', 'DSA', 'Web Dev', 'AI', 'Career'],
=======
        type: String, // Kept as simple String to avoid validation crash if an unknown category is used
>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c
        default: 'Programming'
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
