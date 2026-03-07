const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Enrollment = require('../models/Enrollment');
const CourseProgress = require('../models/CourseProgress');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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

// ── GET /api/enrollments/my-courses ──────────────────────────────────────────
// Returns all courses a user is enrolled in
router.get('/my-courses', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    try {
        const enrollments = await Enrollment.find({ userId }).sort({ purchaseDate: -1 });
        res.json({ ok: true, courses: enrollments });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/enrollments/check ────────────────────────────────────────────────
// Check if user is enrolled in a specific course
router.get('/check', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId required' });

    try {
        const enrollment = await Enrollment.findOne({ userId, courseId });
        res.json({ ok: true, enrolled: !!enrollment });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/enrollments/all-status ────────────────────────────────────
// Returns { enrolled: Set of courseIds, completed: Set of courseIds }
// Used by certificates.html to render lock/enrolled/completed states in one request
router.get('/all-status', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.json({ ok: true, enrolled: [], completed: [] });

    try {
        const [enrollments, progRecords] = await Promise.all([
            Enrollment.find({ userId }).select('courseId courseName -_id'),
            CourseProgress.find({ userId, testPassed: true }).select('courseId certId earnedAt -_id')
        ]);

        // Build sets of all enrolled course names / IDs
        const enrolledIds = enrollments.map(e => e.courseId || e.courseName).filter(Boolean);
        const completedList = progRecords.map(p => ({
            courseId: p.courseId,
            certId: p.certId,
            earnedAt: p.earnedAt
        }));

        res.json({ ok: true, enrolled: enrolledIds, completed: completedList });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/enrollments/enroll-free ───────────────────────────────
// Instantly enroll a logged-in user in a free course (no payment needed)
// Body: { courseId, courseName }
router.post('/enroll-free', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    const { courseId, courseName } = req.body;
    const id = courseId || courseName;
    if (!id) return res.status(400).json({ ok: false, message: 'courseId or courseName required' });

    try {
        // Idempotent: only create if not already enrolled
        const existing = await Enrollment.findOne({ userId, $or: [{ courseId: id }, { courseName: id }] });
        if (existing) {
            return res.json({ ok: true, message: 'Already enrolled', alreadyEnrolled: true });
        }

        await Enrollment.create({
            userId,
            courseId: id,
            courseName: courseName || courseId,
            purchaseDate: new Date(),
            status: 'approved',
            amountPaid: 0,
            utr: 'FREE-' + Date.now()
        });

        res.status(201).json({ ok: true, message: 'Enrolled successfully!' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
