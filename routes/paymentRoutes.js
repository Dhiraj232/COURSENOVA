const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const { generateCertificate } = require('../controllers/certificateController');
const { sendCertificateEmail } = require('../controllers/emailController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// ── Multer setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Helper: extract userId from Bearer token
function extractUserId(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return payload.userId || payload.id || null;
    } catch {
        return null;
    }
}

// ── POST /api/payments/submit ─────────────────────────────────────────────────
// User submits UPI payment with screenshot
router.post('/submit', upload.single('screenshot'), async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

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

// ── GET /api/payments ─────────────────────────────────────────────────────────
// Admin: get all payments (sorted newest first)
router.get('/', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 });
        res.json({ ok: true, data: payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/payments/my ──────────────────────────────────────────────────────
// User: get their own payments
router.get('/my', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });
    try {
        const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
        res.json({ ok: true, data: payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/payments/:id/approve ────────────────────────────────────────────
// Admin: approve payment → auto-enroll user and create Enrollment record
router.post('/:id/approve', async (req, res) => {
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
        await User.findByIdAndUpdate(
            payment.userId,
            { $addToSet: { enrolledCourses: payment.courseName } },
            { new: true }
        );

        res.json({ ok: true, message: 'Payment approved. User enrolled in course.' });
    } catch (err) {
        console.error('Approve Error:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/payments/:id/reject ─────────────────────────────────────────────
// Admin: reject payment
router.post('/:id/reject', async (req, res) => {
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
