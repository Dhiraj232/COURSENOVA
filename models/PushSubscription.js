const mongoose = require('mongoose');

/**
 * PushSubscription Model
 * Stores Web Push API subscription objects per user device.
 * A single user can have multiple subscriptions (phone, laptop, tablet).
 */
const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreUser',
        required: true,
        index: true
    },

    // Web Push API subscription object (from browser's PushManager.subscribe())
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },

    // Device info for admin analytics
    userAgent: { type: String, default: '' },
    browser: { type: String, default: '' }, // Chrome, Firefox, Edge, Safari

    // Status
    isActive: { type: Boolean, default: true },
    failCount: { type: Number, default: 0 }, // Incremented on push failure
    lastUsed: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Auto-deactivate subscriptions with 5+ consecutive failures (expired/invalid endpoint)
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
