const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    purchaseDate: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false } // Easy way to track if they should get a certificate
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);
