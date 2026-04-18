const mongoose = require('mongoose');

// ── Lesson subdocument ────────────────────────────────────────────────────────
const LessonSchema = new mongoose.Schema({
    lessonId: { type: String, required: true },   // e.g. 'lesson-1'
    title: { type: String, required: true },
    videoUrl: { type: String, default: '' },       // YouTube embed URL
    pdfUrl: { type: String, default: '' },        // URL or relative path to PDF
    order: { type: Number, default: 0 }
}, { _id: false });

// ── Quiz question subdocument ─────────────────────────────────────────────────
const QuizQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], validate: v => v.length === 4 },  // always 4 options
    correctIndex: { type: Number, required: true, min: 0, max: 3 }
}, { _id: false });

// ── Course ────────────────────────────────────────────────────────────────────
const CourseSchema = new mongoose.Schema({
    // URL-friendly identifier, e.g. "web-development-bootcamp"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Display name
    title: { type: String, required: true, trim: true },

    // Emoji icon shown on the card (e.g. "🌐")
    icon: { type: String, default: '📚' },

    // Short marketing description
    description: { type: String, default: '' },

    // Price in INR. 0 = free.
    price: { type: Number, required: true, min: 0, default: 0 },
    isFree: { type: Boolean, default: false },

    // Premium course gate — true means payment required before access
    isPremium: { type: Boolean, default: false },

    // Minimum score % to pass the final exam and earn a certificate
    examPassPercent: { type: Number, default: 60, min: 0, max: 100 },
    // Card metadata
    duration: { type: String, default: '' },     // e.g. "6 Weeks"
    level: { type: String, default: 'Beginner', enum: ['Beginner', 'Intermediate', 'Advanced'] },
    assignments: { type: Number, default: 0 },

    // Bullet point list shown on card
    highlights: { type: [String], default: [] },

    // ── Multi-lesson content ──────────────────────────────────────────────────
    // Each course can have multiple lessons; each lesson has a video + PDF.
    lessons: { type: [LessonSchema], default: [] },

    // ── Quiz questions (set by admin) ─────────────────────────────────────────
    quizQuestions: { type: [QuizQuestionSchema], default: [] },

    // Legacy single-resource fields (kept for backwards compat)
    videoUrl: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    thumbnail: { type: String, default: '' },

    // Admin can disable a course without deleting it
    isActive: { type: Boolean, default: true },

    category: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

CourseSchema.pre('save', function () {
    this.updatedAt = new Date();
});

module.exports = mongoose.models.Course || mongoose.model('Course', CourseSchema);
