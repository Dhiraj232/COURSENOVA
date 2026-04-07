const mongoose = require('mongoose');

const UserAnalyticsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true, unique: true },
    learningStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
    totalTimeSpent: { type: Number, default: 0 }, // total minutes on platform

    // Activity per day: [{ date: "2026-04-07", minutes: 45 }]
    dailyActivity: [{
        date: { type: String },
        minutes: { type: Number, default: 0 }
    }],

    // Marketplace Stats
    marketplaceEarnings: { type: Number, default: 0 },
    booksListed: { type: Number, default: 0 },
    booksSold: { type: Number, default: 0 },
    booksPurchased: { type: Number, default: 0 },

    // Topic-wise strengths/weaknesses (Existing)
    topicPerformance: [{
        topic: { type: String },
        score: { type: Number }, // 0-100 average in that topic
        totalQuestions: { type: Number, default: 0 }
    }],

    // Cache some counts for quick dashboard load
    completedModules: { type: Number, default: 0 },
    avgTestScore: { type: Number, default: 0 }
});

module.exports = mongoose.model('UserAnalytics', UserAnalyticsSchema);
