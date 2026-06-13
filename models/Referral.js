/**
 * models/Referral.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose Schema for tracking student invitations and points payouts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreUser',
        required: true
    },
    referredId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreUser',
        required: true,
        unique: true // A user can only be referred once
    },
    pointsAwarded: {
        type: Number,
        default: 100
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Referral', ReferralSchema);
