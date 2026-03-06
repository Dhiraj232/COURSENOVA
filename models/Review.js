const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    comment: { type: String, required: true },

    helpful: { type: Number, default: 0 },
    
    verified: { type: Boolean, default: false }, // Only verified buyers can review

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
ReviewSchema.index({ bookId: 1 });
ReviewSchema.index({ buyerId: 1 });
ReviewSchema.index({ rating: 1 });

module.exports = mongoose.model('Review', ReviewSchema);
