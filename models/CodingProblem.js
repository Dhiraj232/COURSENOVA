const mongoose = require('mongoose');

const codingProblemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    exampleInput: {
        type: String,
        required: true
    },
    exampleOutput: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    solution: {
        type: String, // This can be a reference or a simple verification logic if needed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CodingProblem', codingProblemSchema);
