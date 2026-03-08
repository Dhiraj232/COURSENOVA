const mongoose = require('mongoose');

const practiceQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    category: {
        type: String,
        required: true,
        // Class 9, Class 10, JEE, NEET, SSC, etc.
    },
    subject: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    isMockTestOnly: { type: Boolean, default: false }, // If true, only appears in Mock Tests
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PracticeQuestion', practiceQuestionSchema);
