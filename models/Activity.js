const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true, index: true },
    type: {
        type: String,
        required: true
    },
    title: { type: String, required: true }, // e.g. "Arrays in JavaScript"
    description: { type: String }, // Additional context
    courseId: { type: String },
    courseName: { type: String },
    score: { type: Number },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);
