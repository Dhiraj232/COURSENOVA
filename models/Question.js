const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true,
        validate: [arrayLimit, '{PATH} must have exactly 4 options']
    },
    correctAnswer: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['DSA', 'Web Dev', 'AI', 'Programming'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

function arrayLimit(val) {
    return val.length === 4;
}

module.exports = mongoose.model('Question', questionSchema);
