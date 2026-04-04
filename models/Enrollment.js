const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
<<<<<<< HEAD
    courseName: { type: String, required: true },
=======
    courseName: { type: String, default: '' },
    paymentId: { type: String, default: '' },   // Razorpay paymentId or 'manual'
    amount: { type: Number, default: 0 },
>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c
    purchaseDate: { type: Date, default: Date.now }
});

// Prevent duplicate enrollments
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
