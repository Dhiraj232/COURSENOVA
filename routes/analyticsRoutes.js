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
const Book = require('../models/Book');

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/dashboard
// ──────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const uidString = String(userId);
        let queryUserId = userId;
        if (mongoose.Types.ObjectId.isValid(userId)) queryUserId = new mongoose.Types.ObjectId(userId);

        // 1. User & Core Analytics & Purchases
        const user = await StoreUser.findById(userId).populate('purchasedBooks');
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        let analytics = await UserAnalytics.findOne({ userId: queryUserId });
        if (!analytics) {
            analytics = await UserAnalytics.create({ 
                userId: queryUserId, 
                dailyActivity: [{ date: new Date().toISOString().split('T')[0], minutes: 0 }] 
            });
        }

        // 2. Marketplace Stats (Live aggregation)
        const UsedBook = require('../models/UsedBook');
        const [mktListed, mktSold, mktPurchased] = await Promise.all([
            UsedBook.countDocuments({ sellerId: queryUserId }),
            UsedBook.countDocuments({ sellerId: queryUserId, status: 'sold' }),
            Order.countDocuments({ 
                $or: [{ 'buyer.buyerId': queryUserId }, { 'buyer.buyerId': uidString }], 
                'payment.status': 'completed' 
            })
        ]);

        const earningsResult = await UsedBook.aggregate([
            { $match: { sellerId: queryUserId, status: 'sold' } },
            { $group: { _id: null, total: { $sum: "$price" } } }
        ]);
        const mktEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;

        // 3. Performance & Test metrics
        const testResults = await TestResult.find({ 
            $or: [{ userId: queryUserId }, { userId: uidString }] 
        }).sort({ timestamp: -1 });

        const totalTests = testResults.length;
        const avgScore = totalTests > 0 ? Math.round(testResults.reduce((acc, t) => acc + (t.score || 0), 0) / totalTests) : 0;
        const bestScore = totalTests > 0 ? Math.max(...testResults.map(t => t.score || 0)) : 0;
        const accuracy = testResults.reduce((acc, t) => acc + (t.totalQuestions || 0), 0) > 0
            ? Math.round((testResults.reduce((acc, t) => acc + (t.correctQuestions || 0), 0) / testResults.reduce((acc, t) => acc + (t.totalQuestions || 0), 0)) * 100)
            : 0;

        // 4. Enrollments & Progress
        const enrollDocs = await Enrollment.find({ $or: [{ userId: queryUserId }, { userId: uidString }] });
        const allProgress = await CourseProgress.find({ $or: [{ userId: queryUserId }, { userId: uidString }] });
        
        const enrollments = enrollDocs.map(e => ({
            courseId: e.courseId,
            courseName: e.courseName,
            isPaid: e.amount > 0 || !!e.paymentId
        }));

        const courseDetails = await Promise.all(enrollDocs.map(async (e) => {
            // Guard: only call findById with a valid ObjectId to avoid CastError
            let course = null;
            if (e.courseId && String(e.courseId).match(/^[0-9a-fA-F]{24}$/)) {
                course = await Course.findById(e.courseId).catch(() => null);
            }
            if (!course) {
                course = await Course.findOne({ $or: [{ title: e.courseName }, { slug: (e.courseName || '').toLowerCase().replace(/\s+/g, '-') }] }).catch(() => null);
            }
            const p = allProgress.find(ap => String(ap.courseId) === String(e.courseId) || (course && String(ap.courseId) === String(course._id)));
            return {
                id: course ? course._id : e.courseId,
                title: course ? course.title : e.courseName,
                thumbnail: course ? course.thumbnail : '',
                progress: p ? (p.progressPercent || 0) : 0,
                lastWatched: p ? p.updatedAt : e.purchaseDate
            };
        }));

        res.json({
            ok: true,
            user: { id: user._id, name: user.name, email: user.email, avatar: user.picture },
            stats: {
                totalCourses: enrollments.length,
                totalTestsTaken: totalTests,
                totalTime: analytics.totalTimeSpent,
                streak: analytics.learningStreak,
                avgScore, bestScore, accuracy,
                marketplace: {
                    listed: mktListed,
                    sold: mktSold,
                    purchased: mktPurchased,
                    earnings: mktEarnings
                }
            },
            courses: courseDetails.sort((a,b) => b.lastWatched - a.lastWatched),
            mockTestAccess: user.purchasedMockTest === true || user.hasMockSeriesAccess === true,
            books: user.purchasedBooks || [],
            recentActivities: await Activity.find({ userId: queryUserId }).sort({ timestamp: -1 }).limit(10)
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/analytics/heartbeat
// ──────────────────────────────────────────────────────────────────────────────
router.post('/heartbeat', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const today = new Date().toISOString().split('T')[0];
        
        let analytics = await UserAnalytics.findOne({ userId });
        if (!analytics) {
            analytics = new UserAnalytics({ userId, dailyActivity: [] });
        }

        // 1. Increment Time (Heartbeat is 1 minute)
        analytics.totalTimeSpent += 1;
        
        let todayActivity = analytics.dailyActivity.find(a => a.date === today);
        if (todayActivity) {
            todayActivity.minutes += 1;
        } else {
            analytics.dailyActivity.push({ date: today, minutes: 1 });
            // Cleanup to keep last 30 days
            if (analytics.dailyActivity.length > 30) analytics.dailyActivity.shift();
        }

        // 2. Streak Logic
        const lastDate = analytics.lastActiveDate.toISOString().split('T')[0];
        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                analytics.learningStreak += 1;
                if (analytics.learningStreak > analytics.longestStreak) {
                    analytics.longestStreak = analytics.learningStreak;
                }
            } else {
                analytics.learningStreak = 1; // streak broken
            }
            analytics.lastActiveDate = new Date();
        }

        await analytics.save();
        res.json({ ok: true, streak: analytics.learningStreak, totalTime: analytics.totalTimeSpent });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/weekly
// ──────────────────────────────────────────────────────────────────────────────
router.get('/weekly', requireAuth, async (req, res) => {
    try {
        const analytics = await UserAnalytics.findOne({ userId: req.userId });
        if (!analytics) return res.json({ ok: true, data: [] });

        // Return last 7 entries of dailyActivity
        res.json({ ok: true, data: analytics.dailyActivity.slice(-7) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
