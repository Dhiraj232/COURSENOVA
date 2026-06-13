const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Enrollment = require('../models/Enrollment');
const CourseProgress = require('../models/CourseProgress');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

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

        // Build sets of all enrolled course names / IDs (to support both ObjectId indexing and static title UI mapping)
        const enrolledIds = [];
        enrollments.forEach(e => {
            if (e.courseId) enrolledIds.push(e.courseId);
            if (e.courseName) enrolledIds.push(e.courseName);
        });

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
        // First, find the actual course object
        const Course = require('../models/Course');
        const course = await Course.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { slug: id.toLowerCase().trim() },
                { slug: id.toLowerCase().replace(/-/g, ' ').trim() },
                { slug: id.toLowerCase().replace(/\s+/g, '-').trim() },
                { title: id }
            ].filter(q => q._id !== null || q.slug || q.title)
        });

        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });
        if (!course.isFree && course.price > 0) {
            return res.status(400).json({ ok: false, message: 'This is a premium course. Payment required.' });
        }

        // Idempotent check
        const existing = await Enrollment.findOne({ 
            userId, 
            courseId: String(course._id) 
        });
        if (existing) {
            return res.json({ ok: true, message: 'Already enrolled', alreadyEnrolled: true });
        }

        // Create enrollment
        await Enrollment.create({
            userId,
            courseId:     String(course._id),
            courseName:   course.title,
            purchaseDate: new Date(),
            status:       'approved',
            amountPaid:   0,
            utr:          'FREE-' + Date.now().toString(36).toUpperCase()
        });

        // ── SYNC Legacy User.enrolledCourses (if exists) ──
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user && !user.enrolledCourses.includes(String(course._id))) {
            user.enrolledCourses.push(String(course._id));
            await user.save();
        }
        // ── ACTIVITY LOGGING ──
        const Activity = require('../models/Activity');
        try {
            await Activity.create({
                userId,
                type: 'course_enrolled',
                title: `Enrolled: ${courseName || id}`,
                description: `Started learning ${courseName || id} for free.`,
                courseId: id,
                courseName: courseName || id
            });
        } catch (logErr) {
            console.warn('Silent Enrollment Log Error:', logErr);
        }

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            const uid = String(userId);
            io.to(`user:${uid}`).emit('dashboard_update', {
                type: 'PURCHASE_COMPLETE',
                title: course.title,
                message: `Successfully enrolled in ${course.title}!`
            });
        }

        res.status(201).json({ ok: true, message: 'Enrolled successfully!' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
