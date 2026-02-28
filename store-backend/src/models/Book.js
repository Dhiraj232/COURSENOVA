const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    condition: { type: String, enum: ['New', 'Good', 'Old'], required: true },
    price: { type: Number, required: true },
    images: [{ type: String }], // Array of image URLs
    collegeName: { type: String, required: true }, // Auto-filtered feature
    location: { // Copied from seller for faster geolocating
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    },
    status: { type: String, enum: ['available', 'sold', 'reported'], default: 'available' }
}, { timestamps: true });

// Geolocational index
BookSchema.index({ location: '2dsphere' });
// Application filtering indexes
BookSchema.index({ subject: 1, collegeName: 1 });

module.exports = mongoose.model('Book', BookSchema);
