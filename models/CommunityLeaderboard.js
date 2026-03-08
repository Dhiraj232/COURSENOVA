const mongoose = require('mongoose');

const communityLeaderboardSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    username: { type: String, required: true },
    points: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    answers: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityLeaderboard', communityLeaderboardSchema);
