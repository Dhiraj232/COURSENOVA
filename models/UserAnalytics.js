const mongoose = require('mongoose');

const UserAnalyticsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true, unique: true },
    learningStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: Date.now },
    totalTimeSpent: { type: Number, default: 0 }, // in minutes

    // Activity per day for the last 7 days
    weeklyActivity: [{
        day: { type: String }, // e.g. "Mon", "Tue"
        minutes: { type: Number, default: 0 }
    }],

    // Topic-wise strengths/weaknesses
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
