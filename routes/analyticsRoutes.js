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

// @route   GET /api/analytics/dashboard
// @desc    Return comprehensive student analytics for dynamic dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const uidString = String(userId);
        
        let queryUserId = userId;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            queryUserId = new mongoose.Types.ObjectId(userId);
        }

        // 1. User Profile
        const user = await StoreUser.findById(userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Learner');

        // 2. Performance & Test Metrics
        const testResults = await TestResult.find({ 
            $or: [{ userId: queryUserId }, { userId: uidString }] 
        }).sort({ timestamp: -1 });

        const totalTests = testResults.length;
        const paidTestsCount = testResults.filter(t => t.paymentId || t.isPaid).length;
        const freeTestsCount = totalTests - paidTestsCount;

        const avgScore = totalTests > 0
            ? Math.round(testResults.reduce((acc, t) => acc + (t.score || 0), 0) / totalTests)
            : 0;
        const bestScore = totalTests > 0 ? Math.max(...testResults.map(t => t.score || 0)) : 0;
        
        const totalCorrect = testResults.reduce((acc, t) => acc + (t.correctQuestions || 0), 0);
        const totalQuestions = testResults.reduce((acc, t) => acc + (t.totalQuestions || 0), 0);
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // 3. Overview Stats (Counts & Lists)
        const [enrollDocs, allProgress, analytics, bookOrders, attendedBatches] = await Promise.all([
            Enrollment.find({ $or: [{ userId: queryUserId }, { userId: uidString }] }),
            CourseProgress.find({ $or: [{ userId: queryUserId }, { userId: uidString }] }),
            UserAnalytics.findOne({ userId: queryUserId }),
            Order.find({ 
                $or: [{ 'buyer.buyerId': queryUserId }, { 'buyer.buyerId': uidString }], 
                'payment.status': 'completed' 
            }).populate('items.bookId'),
            Batch.find({ enrolledUsers: { $in: [queryUserId, uidString] } })
        ]);

        // Deduplicate enrollments
        const enrollMap = new Map();
        enrollDocs.forEach(e => enrollMap.set(String(e.courseId || e.courseName), e));
        if (user.enrolledCourses) {
            user.enrolledCourses.forEach(c => {
                if (!enrollMap.has(c)) enrollMap.set(c, { courseId: c, courseName: c, purchaseDate: user.createdAt });
            });
        }
        const enrollments = Array.from(enrollMap.values());
        const paidCoursesCount = enrollments.filter(e => e.amount > 0 || !!e.paymentId).length;
        const freeCoursesCount = enrollments.length - paidCoursesCount;

        // 4. Detailed content lists for "My Library"
        const courseProgressDetails = await Promise.all(enrollments.map(async (e) => {
            let course = await Course.findById(e.courseId);
            if (!course) {
                course = await Course.findOne({ $or: [{ title: String(e.courseId) }, { title: String(e.courseName) }] });
            }
            const p = allProgress.find(ap => 
                String(ap.courseId) === String(e.courseId) || (course && String(ap.courseId) === String(course._id))
            );
            return {
                id: course ? String(course._id) : e.courseId,
                title: course ? course.title : (e.courseName || e.courseId),
                icon: course ? course.icon : '📚',
                progress: p ? p.progressPercent : 0,
                isPaid: (e.amount > 0 || !!e.paymentId || (course && course.price > 0)),
                updatedAt: (p && p.updatedAt) ? p.updatedAt : (e.purchaseDate || user.createdAt)
            };
        }));

        const purchasedBooks = bookOrders.flatMap(order => 
            order.items.map(item => ({
                id: item.bookId ? item.bookId._id : 'legacy',
                title: item.bookTitle,
                price: item.pricePerUnit,
                purchaseDate: order.createdAt,
                status: order.status.current
            }))
        );

        // 5. Final Payload
        res.json({
            ok: true,
            user: {
                id: user._id,
                name: displayName,
                email: user.email,
                avatar: user.picture,
                role: user.role || 'student'
            },
            stats: {
                totalCourses: enrollments.length,
                paidCourses: paidCoursesCount,
                freeCourses: freeCoursesCount,
                totalBatches: attendedBatches.length,
                totalBooks: purchasedBooks.length,
                totalTestsTaken: totalTests,
                paidTests: paidTestsCount,
                freeTests: freeTestsCount,
                totalTime: analytics ? analytics.totalTimeSpent : 0,
                streak: analytics ? analytics.learningStreak : 0,
                avgScore,
                bestScore,
                accuracy
            },
            courses: courseProgressDetails,
            books: purchasedBooks,
            testResults: testResults.slice(0, 10),
            recentActivities: await Activity.find({ userId: queryUserId }).sort({ timestamp: -1 }).limit(10)
        });

    } catch (err) {
        console.error(' [Dashboard API] Error:', err);
        res.status(500).json({ ok: false, message: 'Server error retrieving your dashboard data', error: err.message });
    }
});
;

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
