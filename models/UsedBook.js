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
    
    // --- Marketplace Upgrades ---
    college: { type: String, required: true }, // Required for Nearby Marketplace
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    contactNumber: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    commission: { type: Number, default: 0 }, // 5% or 10rs (calculated on SOLD)

    // Seller info
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    sellerEmail: { type: String, default: '' },

    status: { type: String, enum: ['active', 'sold'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

// Indexes
UsedBookSchema.index({ location: '2dsphere' });
UsedBookSchema.index({ title: 'text', author: 'text', description: 'text' });
UsedBookSchema.index({ category: 1, status: 1 });
UsedBookSchema.index({ sellerId: 1 });
UsedBookSchema.index({ college: 1 });
UsedBookSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UsedBook', UsedBookSchema);
