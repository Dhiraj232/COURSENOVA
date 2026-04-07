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
const Batch = require('../models/Batch');
const Order = require('../models/Order');
const TimeTracking = require('../models/TimeTracking');

// @route   GET /api/dashboard
// @desc    Return comprehensive student analytics for dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Basic User Info & Personalized Display Name
        const user = await StoreUser.findById(userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        // Logic: Fallback to email prefix if name is default "RenVox Learner" or missing
        let displayName = user.name || (user.email ? user.email.split('@')[0] : 'Learner');
        if (displayName === 'RenVox Learner' && user.email) {
            displayName = user.email.split('@')[0];
        }

        // 2. Fetch/Create User Analytics (streak, time, daily activity)
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

        // 3. Course Progress & Metrics (Capture all formats)
        const [enrollDocStr, enrollDocObj, allProgress] = await Promise.all([
            Enrollment.find({ userId: uidString }),
            Enrollment.find({ userId: queryUserId }),
            CourseProgress.find({ $or: [{ userId: queryUserId }, { userId: uidString }] })
        ]);

        // Merge and deduplicate enrollments
        const enrollMap = new Map();
        [...enrollDocStr, ...enrollDocObj].forEach(e => enrollMap.set(String(e.courseId || e.courseName), e));
        
        // Add legacy enrollments from user.enrolledCourses array
        if (user.enrolledCourses && user.enrolledCourses.length > 0) {
            user.enrolledCourses.forEach(title => {
                if (!enrollMap.has(title)) {
                    enrollMap.set(title, { courseId: title, courseName: title, purchaseDate: user.createdAt });
                }
            });
        }

        const enrollments = Array.from(enrollMap.values());
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

        // 4. Test Performance Analytics (Support both ID formats)
        const testResults = await TestResult.find({ 
            $or: [{ userId: queryUserId }, { userId: uidString }] 
        }).sort({ timestamp: -1 });

        const testsPassed = testResults.filter(t => t.passed).length;
        const testsFailed = testResults.filter(t => !t.passed).length;
        const avgScore = testResults.length > 0
            ? Math.round(testResults.reduce((acc, t) => acc + t.score, 0) / testResults.length)
            : 0;

        const bestScore = testResults.length > 0 ? Math.max(...testResults.map(t => t.score)) : 0;
        const accuracy = testResults.length > 0 
            ? Math.round((testResults.reduce((acc, t) => acc + (t.correctQuestions || 0), 0) / testResults.reduce((acc, t) => acc + (t.totalQuestions || 1), 0)) * 100)
            : 0;

        // Weak topics (those with scores < 60%)
        const weakTopics = [...new Set(testResults.filter(t => t.score < 60).map(t => t.courseName || t.topic))];

        // 5. Total Books & Batches
        const [booksPurchased, batchesJoined] = await Promise.all([
            Order.countDocuments({ 
                $or: [{ 'buyer.buyerId': queryUserId }, { 'buyer.buyerId': uidString }], 
                'payment.status': 'completed' 
            }),
            Batch.countDocuments({ enrolledUsers: { $in: [queryUserId, uidString] } })
        ]);

        // 6. Recent Activity Feed
        const recentActivities = await Activity.find({ userId: queryUserId })
            .sort({ timestamp: -1 })
            .limit(10);

        res.json({
            ok: true,
            user: {
                name: displayName,
                email: user.email,
                avatar: user.picture,
                role: user.role || 'student'
            },
            stats: {
                totalCourses,
                completedCourses,
                certificates: certificatesCount,
                streak: analytics.learningStreak,
                avgScore,
                bestScore,
                accuracy,
                totalTestsTaken: testResults.length,
                totalTime: analytics.totalTimeSpent,
                totalBooks: booksPurchased,
                totalBatches: batchesJoined
            },
            courses: courseProgressDetails,
            testResults: testResults.slice(0, 5), // Only last 5 for overview
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

// @route   GET /api/analytics/activity
// @desc    Get detailed activity timeline
router.get('/activity', requireAuth, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.userId })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json({ ok: true, activities });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch activity timeline' });
    }
});

// @route   GET /api/analytics/performance
// @desc    Get detailed performance metrics
router.get('/performance', requireAuth, async (req, res) => {
    try {
        const testResults = await TestResult.find({ userId: req.userId }).sort({ timestamp: -1 });
        
        const metrics = {
            totalTests: testResults.length,
            avgScore: testResults.length > 0 ? Math.round(testResults.reduce((a, b) => a + b.score, 0) / testResults.length) : 0,
            bestScore: testResults.length > 0 ? Math.max(...testResults.map(t => t.score)) : 0,
            accuracy: testResults.length > 0 
                ? Math.round((testResults.reduce((a, b) => a + (b.correctQuestions || 0), 0) / testResults.reduce((a, b) => a + (b.totalQuestions || 1), 0)) * 100) 
                : 0,
            history: testResults
        };

        res.json({ ok: true, metrics });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch performance data' });
    }
});

// @route   POST /api/analytics/time/start
// @desc    Start a time tracking session
router.post('/time/start', requireAuth, async (req, res) => {
    const { context, itemId } = req.body;
    try {
        const session = await TimeTracking.create({
            userId: req.userId,
            context: context || 'platform',
            itemId: itemId || null,
            startTime: new Date()
        });
        res.json({ ok: true, sessionId: session._id });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to start tracking session' });
    }
});

// @route   POST /api/analytics/time/stop
// @desc    Stop a time tracking session and update analytics
router.post('/time/stop', requireAuth, async (req, res) => {
    const { sessionId } = req.body;
    try {
        const session = await TimeTracking.findById(sessionId);
        if (!session || !session.isActive) return res.status(404).json({ ok: false, message: 'Session not found or inactive' });

        session.endTime = new Date();
        session.durationSeconds = Math.round((session.endTime - session.startTime) / 1000);
        session.isActive = false;
        await session.save();

        // Update global analytics
        const minutes = Math.round(session.durationSeconds / 60);
        if (minutes > 0) {
            let analytics = await UserAnalytics.findOne({ userId: req.userId });
            if (!analytics) {
                analytics = new UserAnalytics({
                    userId: req.userId,
                    learningStreak: 1,
                    weeklyActivity: [
                        { day: 'Mon', minutes: 0 }, { day: 'Tue', minutes: 0 }, { day: 'Wed', minutes: 0 },
                        { day: 'Thu', minutes: 0 }, { day: 'Fri', minutes: 0 }, { day: 'Sat', minutes: 0 }, { day: 'Sun', minutes: 0 }
                    ],
                    totalTimeSpent: 0
                });
            }
            analytics.totalTimeSpent += minutes;
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const todayDay = days[new Date().getDay()];
            const todayIdx = analytics.weeklyActivity.findIndex(d => d.day === todayDay);
            if (todayIdx !== -1) analytics.weeklyActivity[todayIdx].minutes += minutes;
            await analytics.save();
        }

        res.json({ ok: true, duration: session.durationSeconds });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to stop tracking session' });
    }
});

module.exports = router;
