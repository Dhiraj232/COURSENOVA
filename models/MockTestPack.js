const mongoose = require('mongoose');

const mockTestPackSchema = new mongoose.Schema({
    id: { type: String, unique: true }, // e.g., 'jee-main-series-2025'
    title: { type: String, required: true },
    category: { type: String, required: true }, // JEE, NEET, SSC etc.
    description: { type: String },
    thumbnail: { type: String, default: 'https://placehold.co/400x200?text=Test+Series' },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: true },
    totalTests: { type: Number, default: 0 },
    // Individual tests within this pack
    tests: [{
        testId: String,
        testTitle: String,
        numQuestions: { type: Number, default: 0 },
        durationMinutes: { type: Number, default: 60 },
        questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PracticeQuestion' }]
    }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MockTestPack', mockTestPackSchema);
