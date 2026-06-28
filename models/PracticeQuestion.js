const mongoose = require('mongoose');

const practiceQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true }, // Legacy/Default question
    question_en: { type: String },              // English version
    question_hi: { type: String },              // Hindi version
    questionHash: { type: String },             // MD5 Hash of normalized question text for duplicate detection

    options: { type: [String], required: true }, // Legacy/Default options
    options_en: { type: [String] },              // English options
    options_hi: { type: [String] },              // Hindi options

    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    explanation_hi: { type: String },            // Hindi explanation
    image: { type: String },                      // Extracted image file path
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

// Indexes for duplicate checking and fast queries
practiceQuestionSchema.index({ question: 1 });
practiceQuestionSchema.index({ question_en: 1 });
practiceQuestionSchema.index({ questionHash: 1 });

module.exports = mongoose.model('PracticeQuestion', practiceQuestionSchema);

