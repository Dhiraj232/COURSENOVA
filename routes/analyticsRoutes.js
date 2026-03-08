const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const UserAnalytics = require('../models/UserAnalytics');
const CourseProgress = require('../models/CourseProgress');
const Enrollment = require('../models/Enrollment');
const StoreUser = require('../models/User');
const Activity = require('../models/Activity');
const TestResult = require('../models/TestResult');
const Course = require('../models/Course');

// @route   GET /api/dashboard
// @desc    Return comprehensive student analytics for dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Basic User Info
        const user = await StoreUser.findById(userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        // 2. Fetch/Create User Analytics (streak, time, daily activity)
        let analytics = await UserAnalytics.findOne({ userId });
        if (!analytics) {
            analytics = new UserAnalytics({
                userId,
                learningStreak: 1,
                weeklyActivity: [
                    { day: 'Mon', minutes: 0 }, { day: 'Tue', minutes: 0 }, { day: 'Wed', minutes: 0 },
                    { day: 'Thu', minutes: 0 }, { day: 'Fri', minutes: 0 }, { day: 'Sat', minutes: 0 }, { day: 'Sun', minutes: 0 }
                ]
            });
            await analytics.save();
        }

        // 3. Course Progress & Metrics
        const enrollments = await Enrollment.find({ userId: String(userId) });
        const allProgress = await CourseProgress.find({ userId });

        const totalCourses = enrollments.length;
        const completedCourses = allProgress.filter(p => p.isCompleted).length;
        const certificatesCount = allProgress.filter(p => p.isCompleted && p.certId).length;

        // Detailed course progress with module counts
        const courseProgressDetails = await Promise.all(enrollments.map(async (e) => {
            const course = await Course.findOne({
                $or: [{ title: e.courseId }, { slug: e.courseId.toLowerCase().replace(/\s+/g, '-') }]
            });
            const p = allProgress.find(ap => ap.courseId === e.courseId);

            const totalModules = (course && course.lessons && course.lessons.length > 0) ? course.lessons.length : 1;
            const completedCount = p ? p.completedLessons.length : 0;
            const progressPercent = p ? p.progressPercent : 0;

            return {
                id: e.courseId,
                title: e.courseName,
                icon: course ? course.icon : '📚',
                progress: progressPercent,
                completedModules: completedCount,
                totalModules: totalModules,
                lastAccessed: p ? p.updatedAt : e.purchaseDate
            };
        }));

        // 4. Test Performance Analytics
        const testResults = await TestResult.find({ userId }).sort({ timestamp: -1 });
        const testsPassed = testResults.filter(t => t.passed).length;
        const testsFailed = testResults.filter(t => !t.passed).length;
        const avgScore = testResults.length > 0
            ? Math.round(testResults.reduce((acc, t) => acc + t.score, 0) / testResults.length)
            : 0;

        // Weak topics (those with scores < 60%)
        const weakTopics = [...new Set(testResults.filter(t => t.score < 60).map(t => t.courseName || t.topic))];

        // 5. Recent Activity Feed
        const recentActivities = await Activity.find({ userId })
            .sort({ timestamp: -1 })
            .limit(10);

        res.json({
            ok: true,
            user: {
                name: user.name,
                email: user.email,
                avatar: user.picture
            },
            stats: {
                totalCourses,
                completedCourses,
                certificates: certificatesCount,
                streak: analytics.learningStreak,
                avgScore,
                testsPassed,
                testsFailed,
                totalTime: analytics.totalTimeSpent
            },
            courses: courseProgressDetails,
            weeklyActivity: analytics.weeklyActivity,
            recentActivities,
            weakTopics
        });

    } catch (err) {
        console.error('API /api/dashboard encountered an issue:', err);
        res.status(500).json({ ok: false, message: 'Server error retrieving dashboard data' });
    }
});

// @route   GET /api/progress/:courseId
// @desc    Return specific course progress details
router.get('/progress/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const progress = await CourseProgress.findOne({ userId: req.userId, courseId });
        const course = await Course.findOne({
            $or: [{ title: courseId }, { slug: courseId.toLowerCase().replace(/\s+/g, '-') }]
        });

        if (!progress) return res.json({ ok: true, progress: { progressPercent: 0, completedLessons: [] } });

        res.json({
            ok: true,
            progress: {
                progressPercent: progress.progressPercent,
                completedLessons: progress.completedLessons,
                isCompleted: progress.isCompleted,
                score: progress.score,
                certId: progress.certId,
                totalLessons: course ? course.lessons.length : 0
            }
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch course progress' });
    }
});

// Maintain legacy /me alias for backwards compatibility
router.get('/me', requireAuth, async (req, res) => {
    res.redirect('/api/analytics/dashboard');
});

module.exports = router;
