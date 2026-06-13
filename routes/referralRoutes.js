/**
 * routes/referralRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * API Routes for the CourseNova student referral program.
 * Mounted at: /api/referral
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const StoreUser = require('../models/User');
const Referral = require('../models/Referral');

/**
 * GET /api/referral/my-code
 * Returns the authenticated user's unique referral code (dynamically generated).
 */
router.get('/my-code', requireAuth, async (req, res) => {
    try {
        const user = await StoreUser.findById(req.userId);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // Generate deterministic, clean referral code: NOVA + FIRSTNAME + LAST 4 DIGITS of User ID
        const cleanFirstName = (user.name || 'USER')
            .split(' ')[0]
            .replace(/[^a-zA-Z]/g, '')
            .toUpperCase();
        
        const referralCode = `NOVA${cleanFirstName}${String(user._id).slice(-4)}`;

        return res.json({
            ok: true,
            referralCode
        });
    } catch (err) {
        console.error('[ReferralAPI] Error fetching code:', err.message);
        return res.status(500).json({ ok: false, message: 'Server error' });
    }
});

/**
 * POST /api/referral/apply
 * Applies a referral code to give points to both the referrer and the referred user.
 */
router.post('/apply', requireAuth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ ok: false, message: 'Referral code is required' });
        }

        const cleanCode = code.trim().toUpperCase();

        const user = await StoreUser.findById(req.userId);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // 1. Prevent applying multiple codes
        const alreadyReferred = await Referral.findOne({ referredId: user._id });
        if (alreadyReferred) {
            return res.status(400).json({ ok: false, message: 'You have already applied a referral code.' });
        }

        // 2. Find referrer by matching generated code
        const allUsers = await StoreUser.find();
        const referrer = allUsers.find(u => {
            const cleanFN = (u.name || 'USER').split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
            const uCode = `NOVA${cleanFN}${String(u._id).slice(-4)}`;
            return uCode === cleanCode;
        });

        if (!referrer) {
            return res.status(404).json({ ok: false, message: 'Invalid referral code.' });
        }

        // 3. Prevent self-referral
        if (String(referrer._id) === String(user._id)) {
            return res.status(400).json({ ok: false, message: 'You cannot refer yourself.' });
        }

        // 4. Record the referral in DB
        await Referral.create({
            referrerId: referrer._id,
            referredId: user._id,
            pointsAwarded: 100
        });

        // 5. Reward referrer (100 points) and referred user (50 points)
        referrer.points = (referrer.points || 0) + 100;
        await referrer.save();

        user.points = (user.points || 0) + 50;
        await user.save();

        console.log(`[Referral] User ${user.email} referred by ${referrer.email}. Points awarded.`);

        return res.json({
            ok: true,
            message: `Referral applied! You earned 50 loyalty points, and your friend earned 100 points.`
        });

    } catch (err) {
        console.error('[ReferralAPI] Error applying code:', err.message);
        return res.status(500).json({ ok: false, message: 'Server error' });
    }
});

module.exports = router;
