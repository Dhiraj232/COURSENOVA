const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true, required: true }, // ORD-20260228-001
    
    buyer: {
        buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        buyerName: String,
        buyerEmail: String,
        buyerPhone: String
    },

    items: [
        {
            bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
            bookTitle: String,
            quantity: { type: Number, default: 1 },
            pricePerUnit: Number,
            totalPrice: Number,
            seller: {
                sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
                sellerName: String
            }
        }
    ],

    pricing: {
        totalAmount: Number,
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        finalAmount: Number
    },

    payment: {
        method: { type: String, enum: ['COD', 'Razorpay', 'UPI'], default: 'COD' },
        status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
        paymentId: String,
        razorpayOrderId: String
    },

    delivery: {
        address: {
            recipientName: String,
            phone: String,
            street: String,
            city: String,
            state: String,
            pincode: Number,
            landmark: String
        },
        trackingNumber: String,
        estimatedDelivery: Date,
        actualDelivery: Date
    },

    status: {
        current: { 
            type: String, 
            enum: ['order_placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
            default: 'order_placed'
        },
        timeline: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                note: String
            }
        ]
    },

    return: {
        status: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'completed'], default: 'none' },
        reason: String,
        requestedAt: Date,
        approvedAt: Date,
        returnedAt: Date
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-generate order number
OrderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.orderNumber = `ORD-${date}-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// Indexes
OrderSchema.index({ 'buyer.buyerId': 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
