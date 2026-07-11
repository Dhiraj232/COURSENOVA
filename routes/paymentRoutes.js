const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

// ── Multer setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'), false);
    }
});

// extractUserId removed (using req.userId directly from requireAuth)

// User submits UPI payment with screenshot
router.post('/submit', requireAuth, upload.single('screenshot'), async (req, res) => {
    const userId = req.userId;

    try {
        const { name, email, courseId, courseName, utr } = req.body;

        if (!name || !email || !courseId || !courseName || !utr) {
            return res.status(400).json({ ok: false, message: 'All fields are required' });
        }
        if (!req.file) {
            return res.status(400).json({ ok: false, message: 'Screenshot is required' });
        }

        const newPayment = new Payment({
            userId,
            name,
            email,
            courseId,
            courseName,
            utr,
            screenshot: `/uploads/${req.file.filename}`,
            status: 'pending'
        });

        const saved = await newPayment.save();
        res.status(201).json({ ok: true, message: 'Payment submitted! Awaiting admin verification.', payment: saved });
    } catch (err) {
        console.error('Payment Submit Error:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// Admin: get all payments (sorted newest first)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 });
        res.json({ ok: true, data: payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// User: get their own payments
router.get('/my', requireAuth, async (req, res) => {
    const userId = req.userId;
    try {
        const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
        res.json({ ok: true, data: payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// Admin: approve payment → auto-enroll user and create Enrollment record
router.post('/:id/approve', requireAdmin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ ok: false, message: 'Payment not found' });
        if (payment.status === 'approved') return res.json({ ok: true, message: 'Already approved' });

        payment.status = 'approved';
        await payment.save();

        // Create Enrollment record (upsert to avoid duplicates)
        await Enrollment.findOneAndUpdate(
            { userId: payment.userId, courseId: payment.courseId },
            { userId: payment.userId, courseId: payment.courseId, courseName: payment.courseName, purchaseDate: new Date() },
            { upsert: true, new: true }
        );

        // Also update User.enrolledCourses array for quick lookup
        // We add both ID and Name to ensure all lookup patterns work instantly
        await User.findByIdAndUpdate(
            payment.userId,
            { $addToSet: { enrolledCourses: { $each: [String(payment.courseId), String(payment.courseName)] } } },
            { new: true }
        );

        res.json({ ok: true, message: 'Payment approved. User enrolled in course.' });

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${payment.userId}`).emit('dashboard_update', {
                type: 'PURCHASE_COMPLETE',
                title: payment.courseName,
                message: `Admin approved your payment for ${payment.courseName}!`
            });
        }
    } catch (err) {
        console.error('Approve Error:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// Admin: reject payment
router.post('/:id/reject', requireAdmin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ ok: false, message: 'Payment not found' });

        payment.status = 'rejected';
        await payment.save();

        res.json({ ok: true, message: 'Payment rejected.' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
