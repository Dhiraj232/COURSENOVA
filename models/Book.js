const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    subject: { type: String, default: '', trim: true },
    condition: { type: String, enum: ['New', 'Used'], default: 'Used' },

    isFree: { type: Boolean, default: false },
    price: { type: Number, default: 0 },

    // Seller info
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreUser', required: true },
    ownerName: { type: String, required: true },
    ownerEmail: { type: String, default: '' },
    contact: { type: String, default: '' }, // WhatsApp / phone

    // Visibility: 'college' or 'child'
    visibilityGroup: { type: String, enum: ['college', 'child'], required: true },
    collegeName: { type: String, default: '' }, // Only for college group

    // Lifecycle
    status: { type: String, enum: ['available', 'sold', 'given'], default: 'available' },

    // Photo (stored as base64 data-URI; for prod use cloud storage)
    img: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now }
});

// Index for fast role-based queries
BookSchema.index({ visibilityGroup: 1, collegeName: 1 });
BookSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Book', BookSchema);
