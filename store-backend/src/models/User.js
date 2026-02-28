const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    profilePicture: { type: String },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },

    // Collected during onboarding:
    collegeName: { type: String },
    city: { type: String },
    location: { // Geospatial coordinates for nearby queries
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [longitude, latitude]
    },
    isOnboarded: { type: Boolean, default: false }
}, { timestamps: true });

// Create 2dsphere index for location-based queries
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
