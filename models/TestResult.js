const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    courseId: { type: String, required: true },
    courseName: { type: String },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    totalQuestions: { type: Number },
    correctQuestions: { type: Number },
    topic: { type: String, default: 'General' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', TestResultSchema);
