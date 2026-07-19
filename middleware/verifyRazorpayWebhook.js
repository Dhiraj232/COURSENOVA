'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Express middleware to verify Razorpay Webhook signatures.
 * Fails with 401/400 if validation fails, protecting endpoint.
 */
module.exports = (req, res, next) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
        logger.warn('[Webhook Signature Validation] Missing Razorpay signature in headers.');
        return res.status(400).json({ ok: false, message: 'Missing Razorpay signature' });
    }

    if (!secret) {
        logger.error('❌ CRITICAL: RAZORPAY_WEBHOOK_SECRET is missing in environment variables');
        return res.status(500).json({ ok: false, message: 'Server configuration error' });
    }

    try {
        const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            logger.warn('[Webhook Signature Validation] Signature mismatch.');
            return res.status(401).json({ ok: false, message: 'Invalid webhook signature' });
        }

        return next();
    } catch (err) {
        logger.error('[Webhook Signature Validation] Error processing raw body:', { error: err.message });
        return res.status(500).json({ ok: false, message: 'Error validating signature' });
    }
};
