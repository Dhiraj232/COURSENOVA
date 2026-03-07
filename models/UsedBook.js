const mongoose = require('mongoose');

const UsedBookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['Engineering', 'Medical', 'Commerce', 'Science', 'Arts', 'School', 'Competitive', 'Other'],
        default: 'Other'
    },
    condition: {
        type: String,
        enum: ['Like New', 'Good', 'Used', 'Old'],
        default: 'Good'
    },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    image: { type: String, default: '' },  // filename stored by Multer
    location: { type: String, default: '' },
    contactNumber: { type: String, default: '' },

    // Seller info (stored at list-time, no separate Seller collection needed)
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    sellerEmail: { type: String, default: '' },

    status: { type: String, enum: ['active', 'sold'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

UsedBookSchema.index({ title: 'text', author: 'text', description: 'text' });
UsedBookSchema.index({ category: 1, status: 1 });
UsedBookSchema.index({ sellerId: 1 });
UsedBookSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UsedBook', UsedBookSchema);
