const mongoose = require('mongoose');

const practiceLeaderboardSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PracticeLeaderboard', practiceLeaderboardSchema, 'practiceleaderboards');
