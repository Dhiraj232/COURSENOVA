const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    // Basic Info
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    edition: { type: String, default: '' },
    year: { type: Number },
    language: { type: String, default: 'English' },
    pages: { type: Number },

    // Categorization
    category: { type: String, required: true }, // Engineering/Competitive/School/MBA/Medical/General
    examType: { type: String, default: '' }, // GATE, ESE, CAT, NEET, etc.
    collegeRelevance: [String], // [BTech, BCA, MTech]

    // Pricing
    price: {
        mrp: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        discount: { type: Number, default: 0 } // calculated as percentage
    },

    // Images
    images: [
        {
            imageType: { type: String, enum: ['front_cover', 'back_cover', 'inside_page'] },
            imageUrl: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }
    ],

    // Description
    description: { type: String, default: '' },
    
    // Syllabus & Chapters
    syllabus: {
        chapters: [
            {
                chapterNumber: Number,
                chapterName: String,
                topics: [String]
            }
        ]
    },

    // Stock Management
    stock: {
        totalQuantity: { type: Number, default: 1 },
        availableQuantity: { type: Number, default: 1 },
        reorderLevel: { type: Number, default: 5 }
    },

    // Seller Information
    seller: {
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
        sellerType: String, // Student/Publisher/Shop
        sellerName: String,
        contactNumber: String,
        email: String,
        address: {
            street: String,
            city: String,
            state: String,
            pincode: Number,
            country: { type: String, default: 'India' }
        },
        collegeInstitute: String,
        returnPolicy: String,
        deliveryDays: { type: Number, default: 3 }
    },

    // Reviews
    reviews: {
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
        reviewsList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
    },

    // Published Details
    publishedDetails: {
        publisher: String,
        isbn: String,
        printedEdition: String
    },

    samplePdf: String, // URL to sample

    tags: [String], // For search optimization
    condition: { type: String, enum: ['New', 'Like New', 'Good', 'Used'], default: 'Used' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    // Analytics
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for fast queries
BookSchema.index({ title: 'text', author: 'text', tags: 'text' });
BookSchema.index({ category: 1, examType: 1 });
BookSchema.index({ 'seller.sellerId': 1 });
BookSchema.index({ status: 1 });
BookSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Book', BookSchema);
