'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/razorpayController');
const { requireAuth } = require('../middleware/auth');
const verifyRazorpayWebhook = require('../middleware/verifyRazorpayWebhook');
const Payment = require('../models/Payment');
const CourseOrder = require('../models/CourseOrder');

// ── GET /api/razorpay/config ─────────────────────────────────────────────────
router.get('/config', requireAuth, controller.getRPConfig);

// ── POST /api/razorpay/create-order ──────────────────────────────────────────
router.post('/create-order', requireAuth, controller.createOrder);

// ── POST /api/razorpay/verify ────────────────────────────────────────────────
router.post('/verify', requireAuth, controller.verifyPayment);

// ── POST /api/razorpay/webhook ───────────────────────────────────────────────
// Webhook signature validation runs as middleware BEFORE passing to the handler
router.post('/webhook', verifyRazorpayWebhook, controller.webhookHandler);

// ── GET /api/razorpay/order-status/:orderId ──────────────────────────────────
router.get('/order-status/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = String(req.userId);

        const order = await CourseOrder.findOne({ razorpay_order_id: orderId, userId });
        if (!order) {
            return res.status(404).json({ ok: false, message: 'Order not found.' });
        }

        return res.json({
            ok:        true,
            orderId:   order.razorpay_order_id,
            status:    order.paymentStatus,       // 'pending' | 'paid' | 'failed'
            paymentId: order.razorpay_payment_id,
            amount:    order.amount,
            courseId:  order.courseId,
        });
    } catch (err) {
        console.error('[order-status]', err.message);
        return res.status(500).json({ ok: false, message: 'Server error.' });
    }
});

// ── GET /api/razorpay/admin/payments ──────────────────────────────────────────
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

// ── GET /api/razorpay/admin/course-orders ──────────────────────────────────────
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
