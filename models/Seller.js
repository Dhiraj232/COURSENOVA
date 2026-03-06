const mongoose = require('mongoose');

const SellerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerType: { type: String, enum: ['Individual', 'PublisherShop'], required: true },

    businessInfo: {
        businessName: { type: String, required: true },
        gstNumber: String,
        panNumber: String,
        businessLicense: String
    },

    address: {
        street: String,
        city: String,
        state: String,
        pincode: Number,
        country: { type: String, default: 'India' },
        latitude: Number,
        longitude: Number
    },

    contactInfo: {
        phoneNumber: { type: String, required: true },
        alternatePhone: String,
        email: { type: String, required: true },
        whatsapp: String,
        landline: String
    },

    collegeInstitute: String,

    verification: {
        isVerified: { type: Boolean, default: false },
        verificationDocs: [
            {
                docType: { type: String, enum: ['college-id', 'aadhar', 'pan', 'gst'] },
                url: String,
                verified: { type: Boolean, default: false }
            }
        ],
        verificationDate: Date,
        verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
    },

    bankDetails: {
        accountHolderName: String,
        accountNumber: String, // Should be encrypted in production
        ifscCode: String,
        bankName: String
    },

    metrics: {
        totalBooksListed: { type: Number, default: 0 },
        activeListings: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        responseTime: Number // in hours
    },

    supportTimings: {
        opening: { type: String, default: '9:00 AM' },
        closing: { type: String, default: '9:00 PM' },
        timezone: { type: String, default: 'IST' }
    },

    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'inactive' }
});

// Indexes
SellerSchema.index({ userId: 1 });
SellerSchema.index({ status: 1 });
SellerSchema.index({ 'verification.isVerified': 1 });

module.exports = mongoose.model('Seller', SellerSchema);
