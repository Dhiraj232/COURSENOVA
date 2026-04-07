/**
 * routes/cashfree.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cashfree Payment Routes for RENVOX AI
 *
 * Mounted at: /api/cashfree
 *
 * POST /api/cashfree/create-order  → Authenticated; creates a new CF order
 * POST /api/cashfree/verify        → Authenticated; manual verify after redirect
 * POST /api/cashfree/webhook       → Public; Cashfree server-to-server events
 * GET  /api/cashfree/admin/payments → Admin-only; list all payment records
 * GET  /api/cashfree/order-status/:orderId → Authenticated; check order status
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IMPORTANT — server.js body-parser setup required:
 *   app.use(express.json({
 *     verify: (req, res, buf) => { req.rawBody = buf; }  // ← needed for webhook HMAC
 *   }));
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/cashfreeController');
const { requireAuth } = require('../middleware/auth');
const Payment    = require('../models/Payment');
const CourseOrder = require('../models/CourseOrder');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cashfree/config
// Returns the Cashfree SDK mode (sandbox/production).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/config', controller.getCFConfig);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cashfree/create-order
// Creates a Cashfree order for a premium course purchase.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, controller.createOrder);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cashfree/verify
// Frontend calls this after Cashfree redirects back to return_url.
// Fetches payment status from Cashfree API server-side — never trusts frontend.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, controller.verifyPayment);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cashfree/webhook
// Cashfree server-to-server webhook.
// ⚠️  NO auth middleware — Cashfree servers don't send JWT tokens.
//     Security is enforced via HMAC-SHA256 signature verification inside handler.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', controller.webhookHandler);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cashfree/order-status/:orderId
// Frontend polling endpoint — returns current order status from DB.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/order-status/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = String(req.userId);

        const order = await CourseOrder.findOne({ orderId, userId });
        if (!order) {
            return res.status(404).json({ ok: false, message: 'Order not found.' });
        }

        return res.json({
            ok:        true,
            orderId:   order.orderId,
            status:    order.status,       // 'pending' | 'paid' | 'failed'
            paymentId: order.paymentId,
            amount:    order.amount,
            courseId:  order.courseId,
        });
    } catch (err) {
        console.error('[order-status]', err.message);
        return res.status(500).json({ ok: false, message: 'Server error.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cashfree/admin/payments
// Admin-only: list all payments (legacy Payment collection)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/payments', requireAuth, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ ok: false, message: 'Forbidden: Admin access required.' });
        }
        const payments = await Payment.find().sort({ createdAt: -1 }).limit(500);
        return res.json({ ok: true, data: payments });
    } catch (err) {
        console.error('[admin/payments]', err.message);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cashfree/admin/course-orders
// Admin-only: list all CourseOrder records
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/course-orders', requireAuth, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ ok: false, message: 'Forbidden: Admin access required.' });
        }
        const orders = await CourseOrder.find()
            .sort({ createdAt: -1 })
            .limit(500)
            .populate('userId',   'name email')
            .populate('courseId', 'title price');
        return res.json({ ok: true, data: orders });
    } catch (err) {
        console.error('[admin/course-orders]', err.message);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
