const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    userPicture: { type: String },
    question: { type: String, required: true },
    details: { type: String },
    image: { type: String, default: '' },
    tags: [String],
    answers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        userPicture: { type: String },
        answer: { type: String },
        upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now },
        isInstructor: { type: Boolean, default: false }
    }],
    bestAnswer: { type: mongoose.Schema.Types.ObjectId },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doubt', doubtSchema);
