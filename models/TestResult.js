const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true, index: true },
    courseId: { type: String, required: true },
    courseName: { type: String },
    score: { type: Number, required: true }, // Net score percentage (obtained marks / total) * 100
    passed: { type: Boolean, required: true },
    totalQuestions: { type: Number },
    correctQuestions: { type: Number },
    incorrectQuestions: { type: Number, default: 0 },
    unattemptedQuestions: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // accuracy percentage
    topic: { type: String, default: 'General' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', TestResultSchema);
