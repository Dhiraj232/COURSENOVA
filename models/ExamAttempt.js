const mongoose = require('mongoose');

/**
 * ExamAttempt — tracks how many times a user has attempted the final exam
 * for a premium course. Max 3 attempts enforced in premium route.
 */
const ExamAttemptSchema = new mongoose.Schema({
    userId:      { type: String, required: true },
    courseId:    { type: String, required: true },
    attempts:    { type: Number, default: 0 },     // incremented each submit
    lastAttempt: { type: Date,   default: null }
});

// Compound unique index: one doc per user+course
ExamAttemptSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.models.ExamAttempt
    || mongoose.model('ExamAttempt', ExamAttemptSchema);
