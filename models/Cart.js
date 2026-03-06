const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [
        {
            bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            quantity: { type: Number, default: 1, min: 1 },
            priceAtAddTime: Number,
            seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
            addedAt: { type: Date, default: Date.now }
        }
    ],

    totalItems: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },

    lastUpdated: { type: Date, default: Date.now }
});

// Update timestamps
CartSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Indexes
CartSchema.index({ userId: 1 });

module.exports = mongoose.model('Cart', CartSchema);
