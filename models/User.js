const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    picture: { type: String, default: '' },

    // Profile setup (filled after first login)
    profileComplete: { type: Boolean, default: false },
    role: { type: String, enum: ['college', 'child', 'student', ''], default: '' },

    // College fields
    collegeName: { type: String, default: '' },
    department: { type: String, default: '' },
    year: { type: String, default: '' }, // e.g. "1st Year", "Senior", etc.

    // Child / School fields
    childClass: { type: String, default: '' }, // e.g. "Class 8", "Grade 5"

    // Array of course titles the user has paid for or enrolled in
    enrolledCourses: [{ type: String }],
    purchasedCourses: [{ type: String }], // New standard list (mirrors enrolledCourses)

    // Premium Mock Test System access flag (₹59 series)
    hasMockSeriesAccess: { type: Boolean, default: false },
    purchasedMockTest: { type: Boolean, default: false }, // New standard flag

    // Array of purchased book ObjectIDs
    purchasedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],

    lastLogin: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreUser', UserSchema);
