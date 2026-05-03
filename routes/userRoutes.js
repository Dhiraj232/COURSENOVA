const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const StoreUser = require('../models/User');
const Transaction = require('../models/Transaction');
const Enrollment = require('../models/Enrollment');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');

// ── GET /api/user/profile ─────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await StoreUser.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
        res.json({ ok: true, profile: user });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// ── PUT /api/user/profile/update ─────────────────────────────────────────
router.put('/profile/update', requireAuth, async (req, res) => {
    try {
        const { fullName, collegeName, department, year, picture } = req.body;
        const user = await StoreUser.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        if (fullName) user.name = fullName;
        if (collegeName) user.collegeName = collegeName;
        if (department) user.department = department;
        if (year) user.year = year;
        if (picture) user.picture = picture;

        await user.save();
        res.json({ ok: true, message: 'Profile updated', user });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Update failed' });
    }
});

// ── POST /api/user/update-phone ─────────────────────────────────────────
router.post('/update-phone', requireAuth, async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await StoreUser.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        user.phone = phone;
        await user.save();
        res.json({ ok: true, message: 'Phone updated successfully' });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to update phone' });
    }
});

// ── GET /api/user/courses ─────────────────────────────────────────
router.get('/courses', requireAuth, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ userId: String(req.userId) });
        const allProgress = await CourseProgress.find({ userId: req.userId });

        const detailedCourses = await Promise.all(enrollments.map(async (e) => {
            const course = await Course.findOne({
                $or: [{ title: e.courseId }, { slug: e.courseId.toLowerCase().replace(/\s+/g, '-') }]
            });
            const p = allProgress.find(ap => ap.courseId === e.courseId);

            return {
                id: e.courseId,
                title: e.courseName,
                instructor: "CourseNova Expert",
                icon: course ? course.icon : '📚',
                progress: p ? p.progressPercent : 0,
                startDate: e.purchaseDate,
                lastAccessed: p ? p.updatedAt : e.purchaseDate
            };
        }));

        res.json({ ok: true, courses: detailedCourses });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch courses' });
    }
});

// ── GET /api/user/payments ─────────────────────────────────────────
router.get('/payments', requireAuth, async (req, res) => {
    try {
        const payments = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
        res.json({ ok: true, payments });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch payments' });
    }
});

// ── GET /api/user/certificates ─────────────────────────────────────────
router.get('/certificates', requireAuth, async (req, res) => {
    try {
        const certs = await CourseProgress.find({
            userId: req.userId,
            isCompleted: true,
            certId: { $ne: null }
        });
        res.json({ ok: true, certificates: certs });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch certificates' });
    }
});

// ── POST /api/user/profile/upload ─────────────────────────────────────────
// For uploading profile picture
router.post('/profile/upload', requireAuth, async (req, res) => {
    // In a full implementation, you'd use multer and upload to 'uploads/'
    // For now, we allow sending a URL or Base64 (simplified)
    const { picture } = req.body;
    try {
        const user = await StoreUser.findById(req.userId);
        if (user) {
            user.picture = picture;
            await user.save();
            res.json({ ok: true, message: 'Picture updated', picture });
        } else {
            res.status(404).json({ ok: false, message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Upload failed' });
    }
});

// ── GET /api/user/dashboard-stats ─────────────────────────────────
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const user = await StoreUser.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        const [enrollmentCount, testResults, payments] = await Promise.all([
            Enrollment.countDocuments({ userId: String(req.userId) }),
            require('../models/TestResult').find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5),
            Transaction.find({ userId: req.userId }).sort({ date: -1 }).limit(3)
        ]);

        // Calculate avg accuracy from last 5 tests
        const accuracy = testResults.length > 0 
            ? (testResults.reduce((acc, curr) => acc + curr.accuracy, 0) / testResults.length).toFixed(1)
            : 0;

        res.json({
            ok: true,
            stats: {
                points: user.points || 0,
                rank: user.rank || 'N/A',
                streak: user.streak || 0,
                enrolledCourses: enrollmentCount,
                testsTaken: testResults.length,
                avgAccuracy: accuracy,
                recentTests: testResults,
                recentPayments: payments,
                isPremium: user.isPremium || false
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
