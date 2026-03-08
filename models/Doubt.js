const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    userPicture: { type: String },
    question: { type: String, required: true },
    details: { type: String },
    answers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        userPicture: { type: String },
        answer: { type: String },
        createdAt: { type: Date, default: Date.now },
        isInstructor: { type: Boolean, default: false }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Doubt', doubtSchema);
