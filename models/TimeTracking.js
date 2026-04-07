const mongoose = require('mongoose');

const timeTrackingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    context: {
        type: String,
        enum: ['course', 'test', 'platform', 'general'],
        default: 'platform'
    },
    itemId: {
        type: String, // course title or packId
        default: null
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    durationSeconds: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('TimeTracking', timeTrackingSchema);
