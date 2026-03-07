const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const User = require('../models/User');
const { adminAuth } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin_secret_change_me';

// ── POST /api/admin/login ─────────────────────────────────────────────────────
router.post('/login', [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@renvox.ai';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ ok: false, message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
        { isAdmin: true, adminId: 'renvox_admin', email: ADMIN_EMAIL },
        ADMIN_JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ ok: true, token, expiresIn: '8h' });
});

// ── GET /api/admin/verify ─────────────────────────────────────────────────────
router.get('/verify', adminAuth, (req, res) => {
    res.json({ ok: true, message: 'Admin token valid.' });
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [totalPayments, pending, approved, rejected, totalStudents, totalCourses, totalEnrollments] = await Promise.all([
            Payment.countDocuments(),
            Payment.countDocuments({ status: 'pending' }),
            Payment.countDocuments({ status: 'approved' }),
            Payment.countDocuments({ status: 'rejected' }),
            User.countDocuments(),
            Course.countDocuments({ isActive: true }),
            Enrollment.countDocuments()
        ]);
        res.json({ ok: true, stats: { totalPayments, pending, approved, rejected, totalStudents, totalCourses, totalEnrollments } });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/admin/payments ───────────────────────────────────────────────────
router.get('/payments', adminAuth, async (req, res) => {
    try {
        const status = req.query.status;
        const filter = status ? { status } : {};
        const payments = await Payment.find(filter).sort({ createdAt: -1 });
        res.json({ ok: true, data: payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/admin/payments/:id/approve ──────────────────────────────────────
router.post('/payments/:id/approve', adminAuth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ ok: false, message: 'Payment not found.' });
        if (payment.status === 'approved') return res.json({ ok: true, message: 'Already approved.' });

        payment.status = 'approved';
        await payment.save();

        await Enrollment.findOneAndUpdate(
            { userId: payment.userId, courseId: payment.courseId },
            {
                userId: payment.userId,
                courseId: payment.courseId,
                courseName: payment.courseName,
                purchaseDate: new Date()
            },
            { upsert: true, new: true }
        );

        await User.findByIdAndUpdate(
            payment.userId,
            { $addToSet: { enrolledCourses: payment.courseName } }
        );

        res.json({ ok: true, message: `Payment approved. ${payment.name} enrolled in ${payment.courseName}.` });
    } catch (err) {
        console.error('Admin Approve Error:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/admin/payments/:id/reject ───────────────────────────────────────
router.post('/payments/:id/reject', adminAuth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ ok: false, message: 'Payment not found.' });

        payment.status = 'rejected';
        await payment.save();

        res.json({ ok: true, message: 'Payment rejected.' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/admin/courses ────────────────────────────────────────────────────
router.get('/courses', adminAuth, async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 });
        res.json({ ok: true, data: courses });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/admin/courses ───────────────────────────────────────────────────
router.post('/courses', adminAuth, [
    body('title').notEmpty().withMessage('Title required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('slug').notEmpty().withMessage('Slug required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json({ ok: true, course });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── PUT /api/admin/courses/:id ────────────────────────────────────────────────
router.put('/courses/:id', adminAuth, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });
        res.json({ ok: true, course });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── DELETE /api/admin/courses/:id ─────────────────────────────────────────────
router.delete('/courses/:id', adminAuth, async (req, res) => {
    try {
        await Course.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ ok: true, message: 'Course deactivated.' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/admin/courses/:id/lessons ──────────────────────────────────────
// Add a new lesson to a course (or update by lessonId if already exists)
// Body: { lessonId, title, videoUrl, pdfUrl }
router.post('/courses/:id/lessons', adminAuth, async (req, res) => {
    try {
        const { lessonId, title, videoUrl, pdfUrl } = req.body;
        if (!lessonId || !title) return res.status(400).json({ ok: false, message: 'lessonId and title are required.' });

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });

        // Update existing lesson or push new one
        const existingIdx = course.lessons.findIndex(l => l.lessonId === lessonId);
        if (existingIdx >= 0) {
            course.lessons[existingIdx] = { lessonId, title, videoUrl: videoUrl || '', pdfUrl: pdfUrl || '', order: existingIdx };
        } else {
            course.lessons.push({ lessonId, title, videoUrl: videoUrl || '', pdfUrl: pdfUrl || '', order: course.lessons.length });
        }

        await course.save();
        res.json({ ok: true, lessons: course.lessons });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── DELETE /api/admin/courses/:id/lessons/:lessonId ───────────────────────────
router.delete('/courses/:id/lessons/:lessonId', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });

        course.lessons = course.lessons.filter(l => l.lessonId !== req.params.lessonId);
        // Re-order
        course.lessons.forEach((l, i) => { l.order = i; });
        await course.save();
        res.json({ ok: true, lessons: course.lessons });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── PUT /api/admin/courses/:id/quiz ──────────────────────────────────────────
// Replace the entire quiz question set for a course
// Body: { questions: [{ question, options[4], correctIndex }] }
router.put('/courses/:id/quiz', adminAuth, async (req, res) => {
    try {
        const { questions } = req.body;
        if (!Array.isArray(questions)) return res.status(400).json({ ok: false, message: 'questions must be an array.' });

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });

        // Validate each question
        for (const q of questions) {
            if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== 'number') {
                return res.status(400).json({ ok: false, message: 'Each question must have question, options[4], and correctIndex.' });
            }
        }

        course.quizQuestions = questions;
        await course.save();
        res.json({ ok: true, quizQuestions: course.quizQuestions });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/admin/courses/:id/students ──────────────────────────────────────
// Get enrolled students with their progress for a specific course
router.get('/courses/:id/students', adminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found.' });

        // Enrollments by courseId (course title) or by courseName
        const enrollments = await Enrollment.find({
            $or: [{ courseId: course.title }, { courseName: course.title }]
        });

        // Fetch progress for each enrolled user
        const studentData = await Promise.all(enrollments.map(async (enr) => {
            const user = await User.findById(enr.userId).select('name email picture').lean();
            const progress = await CourseProgress.findOne({ userId: enr.userId, courseId: course.title }).lean();
            return {
                userId: enr.userId,
                name: user ? user.name : 'Unknown',
                email: user ? user.email : '',
                picture: user ? user.picture : '',
                enrolledAt: enr.purchaseDate,
                progressPercent: progress ? progress.progressPercent : 0,
                testPassed: progress ? progress.testPassed : false,
                certId: progress ? progress.certId : null,
                score: progress ? progress.score : 0
            };
        }));

        res.json({ ok: true, course: { title: course.title, _id: course._id }, students: studentData });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
