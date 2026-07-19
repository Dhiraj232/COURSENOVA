const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    password: { type: String }, // For manual admin login
    picture: { type: String, default: '' },

    // Profile setup (filled after first login)
    profileComplete: { type: Boolean, default: false },
    role: { type: String, enum: ['student', 'admin', 'college', 'child', 'user', ''], default: 'user' },
    
    // Subscription & Streaks
    isPremium: { type: Boolean, default: false },
    subscriptionExpiry: { type: Date },
    streak: { type: Number, default: 0 },
    lastChallengeDate: { type: String }, // To track streaks (e.g. "2024-05-02")

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

    // Gamification & Community
    points: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    badges: [{ type: String }],

    // Notification Preferences
    notificationPreferences: {
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        dailyChallenge: { type: Boolean, default: true },
        mockTest: { type: Boolean, default: true },
        discounts: { type: Boolean, default: true },
        newCourses: { type: Boolean, default: true },
        orderUpdates: { type: Boolean, default: true },
        courseProgress: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true }
    },

    // Tracks last time each reminder type was sent (prevents duplicate daily sends)
    lastNotifiedAt: {
        type: Map,
        of: Date,
        default: {}
    },

    lastLogin: { type: Date, default: Date.now },
    lastLogout: { type: Date },
    lastActive: { type: Date },
    currentPath: { type: String, default: '' },
    pageHistory: [{
        path: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const StoreUser = mongoose.models.StoreUser || mongoose.model('StoreUser', UserSchema);
if (!mongoose.models.User) {
    mongoose.model('User', UserSchema, 'storeusers');
}
module.exports = StoreUser;
