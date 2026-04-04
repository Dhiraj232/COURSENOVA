const express = require('express');
const mongoose = require('mongoose'); // Added missing import
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
        // Ensure userId is handled correctly for both String (Enrollment) and ObjectId (others)
        const uidString = String(userId);
        let queryUserId = userId;
        try {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                queryUserId = new mongoose.Types.ObjectId(userId);
            }
        } catch (e) {
            console.warn('ObjectId cast warning:', e.message);
        }

        let analytics = await UserAnalytics.findOne({ userId: queryUserId });
        if (!analytics) {
            analytics = new UserAnalytics({
                userId,
                learningStreak: 1,
                weeklyActivity: [
                    { day: 'Mon', minutes: 0 }, { day: 'Tue', minutes: 0 }, { day: 'Wed', minutes: 0 },
                    { day: 'Thu', minutes: 0 }, { day: 'Fri', minutes: 0 }, { day: 'Sat', minutes: 0 }, { day: 'Sun', minutes: 0 }
                ],
                totalTimeSpent: 0
            });
            await analytics.save();
        }

        // 3. Course Progress & Metrics
        const enrollments = await Enrollment.find({ userId: uidString });
        const allProgress = await CourseProgress.find({ userId: queryUserId });

        const totalCourses = enrollments.length;
        const completedCourses = allProgress.filter(p => p.isCompleted).length;
        const certificatesCount = allProgress.filter(p => p.certId).length;

        // Detailed course progress with module counts
        const courseProgressDetails = await Promise.all(enrollments.map(async (e) => {
            // Priority 1: Match by direct ObjectID match
            let course = await Course.findById(e.courseId);
            
            // Priority 2: Fallback to title/Slug match
            if (!course) {
                course = await Course.findOne({
                    $or: [
                        { title: String(e.courseId) },
                        { title: String(e.courseName) },
                        { slug: String(e.courseId).toLowerCase().replace(/\s+/g, '-') }
                    ]
                });
            }

            const p = allProgress.find(ap => 
                String(ap.courseId) === String(e.courseId) || 
                (course && String(ap.courseId) === String(course._id))
            );

            const totalModules = (course && course.lessons && course.lessons.length > 0) ? course.lessons.length : 1;
            const completedCount = p ? (p.completedLessons ? p.completedLessons.length : 0) : 0;
            const progressPercent = p ? p.progressPercent : 0;

            return {
                id: course ? String(course._id) : e.courseId,
                title: course ? course.title : e.courseName,
                icon: course ? course.icon : '📚',
                progress: progressPercent,
                isPaid: (e.amount > 0 || !!e.paymentId), // New field for Paid status
                completedModules: completedCount,
                totalModules: totalModules,
                lastAccessed: (p && p.updatedAt) ? p.updatedAt : e.purchaseDate
            };
        }));

        // 4. Test Performance Analytics
        const testResults = await TestResult.find({ userId: queryUserId }).sort({ timestamp: -1 });
        const testsPassed = testResults.filter(t => t.passed).length;
        const testsFailed = testResults.filter(t => !t.passed).length;
        const avgScore = testResults.length > 0
            ? Math.round(testResults.reduce((acc, t) => acc + t.score, 0) / testResults.length)
            : 0;

        // Weak topics (those with scores < 60%)
        const weakTopics = [...new Set(testResults.filter(t => t.score < 60).map(t => t.courseName || t.topic))];

        // 5. Recent Activity Feed
        const recentActivities = await Activity.find({ userId: queryUserId })
            .sort({ timestamp: -1 })
            .limit(10);

        res.json({
            ok: true,
            user: {
                name: user.name,
                email: user.email,
                avatar: user.picture,
                role: user.role || 'student' // Added for rank mapping
            },
            stats: {
                totalCourses,
                completedCourses,
                certificates: certificatesCount,
                streak: analytics.learningStreak,
                avgScore,
                testsPassed,
                testsFailed,
                totalTestsTaken: testResults.length, // Added
                totalTime: analytics.totalTimeSpent
            },
            courses: courseProgressDetails,
            testResults, // Added all tests history
            weeklyActivity: analytics.weeklyActivity,
            recentActivities,
            weakTopics
        });

    } catch (err) {
        console.error('API /api/dashboard error:', err);
        // Log to file for AI/Dev debugging
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', 'error.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Dashboard Error: ${err.message}\n${err.stack}\n`);
        
        res.status(500).json({ ok: false, message: 'Server error retrieving dashboard data', debug: err.message });
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

// @route   POST /api/track-time
// @desc    Increments live time spent correctly every minute
router.post('/track-time', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        let queryUserId = userId;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            queryUserId = new mongoose.Types.ObjectId(userId);
        }

        let analytics = await UserAnalytics.findOne({ userId: queryUserId });
        if (!analytics) {
            analytics = new UserAnalytics({
                userId: queryUserId,
                learningStreak: 1,
                weeklyActivity: [
                    { day: 'Mon', minutes: 0 }, { day: 'Tue', minutes: 0 }, { day: 'Wed', minutes: 0 },
                    { day: 'Thu', minutes: 0 }, { day: 'Fri', minutes: 0 }, { day: 'Sat', minutes: 0 }, { day: 'Sun', minutes: 0 }
                ],
                totalTimeSpent: 0
            });
        }
        
        analytics.totalTimeSpent += 1;
        
        // Update today's weekly graph
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayDay = days[new Date().getDay()];
        const todayIdx = analytics.weeklyActivity.findIndex(d => d.day === todayDay);
        if (todayIdx !== -1) {
            analytics.weeklyActivity[todayIdx].minutes += 1;
        }

        await analytics.save();
        res.json({ ok: true, totalTime: analytics.totalTimeSpent, weeklyActivity: analytics.weeklyActivity });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error tracking time' });
    }
});

module.exports = router;
