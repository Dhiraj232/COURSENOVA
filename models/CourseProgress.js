const mongoose = require('mongoose');

const CourseProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    courseId: { type: String, required: true },
    videoWatched: { type: Boolean, default: false },
    pdfRead: { type: Boolean, default: false },
    testPassed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    certId: { type: String, default: null },
    earnedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CourseProgress', CourseProgressSchema);
