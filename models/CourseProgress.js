const mongoose = require('mongoose');

const CourseProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    courseId: { type: String, required: true },

    // ── Granular per-lesson tracking ──────────────────────────────────────────
    // Stores the lessonId strings of completed lessons (e.g. ['lesson-1', 'lesson-2'])
    completedLessons: { type: [String], default: [] },

    // Legacy item-level tracking (kept for backwards compat)
    completedVideos: { type: [String], default: [] },
    completedTests: { type: [String], default: [] },

    // Legacy boolean flags (kept for backwards compat)
    videoWatched: { type: Boolean, default: false },
    pdfRead: { type: Boolean, default: false },

    // Derived percentage (0–100). Updated whenever progress is saved.
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    // True when all lessons completed AND test passed
    isCompleted: { type: Boolean, default: false },

    // Test result
    testPassed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },

    // Certificate
    certId: { type: String, default: null },
    earnedAt: { type: Date, default: null },

    updatedAt: { type: Date, default: Date.now }
});

// Ensure one progress record per user+course
CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.models.CourseProgress || mongoose.model('CourseProgress', CourseProgressSchema);
