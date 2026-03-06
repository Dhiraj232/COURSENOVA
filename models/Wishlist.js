const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [
        {
            bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            addedAt: { type: Date, default: Date.now },
            notifyOnDiscount: { type: Boolean, default: false }
        }
    ],

    totalItems: { type: Number, default: 0 },

    lastUpdated: { type: Date, default: Date.now }
});

// Update timestamps
WishlistSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Indexes
WishlistSchema.index({ userId: 1 });

module.exports = mongoose.model('Wishlist', WishlistSchema);
