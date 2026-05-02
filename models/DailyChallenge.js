const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    title: { type: String, required: true },
    examType: { type: String, required: true }, // e.g., 'SSC CGL', 'Railway', 'CTET'
    questions: [{
        question: String,
        question_hi: String,
        options: [String],
        options_hi: [String],
        correctAnswer: String,
        explanation: String,
        explanation_hi: String
    }],
    totalQuestions: { type: Number, default: 150 },
    durationMinutes: { type: Number, default: 120 },
    isPremium: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    pdfUrl: String,
    solutionsPdfUrl: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
