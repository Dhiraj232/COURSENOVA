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
        if (mongoose.Types.ObjectId.isValid(userId)) {
            queryUserId = new mongoose.Types.ObjectId(userId);
        }

        // 1. Fetch User & Analytics Base
        const user = await StoreUser.findById(userId).populate('purchasedBooks');
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        let analytics = await UserAnalytics.findOne({ userId: queryUserId });
        if (!analytics) {
            analytics = await UserAnalytics.create({ 
                userId: queryUserId, 
                dailyActivity: [{ date: new Date().toISOString().split('T')[0], minutes: 0 }] 
            });
        }

        // 2. Marketplace Stats (Seller Activity)
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
        const accuracy = testResults.reduce((acc, t) => acc + (t.totalQuestions || 0), 0) > 0
            ? Math.round((testResults.reduce((acc, t) => acc + (t.correctQuestions || 0), 0) / testResults.reduce((acc, t) => acc + (t.totalQuestions || 0), 0)) * 100)
            : 0;

        // 4. Enrollments & Progress Sync
        const enrollDocs = await Enrollment.find({ 
            $or: [{ userId: queryUserId }, { userId: uidString }] 
        });
        const allProgress = await CourseProgress.find({ 
            $or: [{ userId: queryUserId }, { userId: uidString }] 
        });
        
        const courseIds = enrollDocs.map(e => e.courseId);
        const courseNames = enrollDocs.map(e => e.courseName);
        
        const matchedCourses = await Course.find({
            $or: [
                { _id: { $in: courseIds.filter(id => String(id).match(/^[0-9a-fA-F]{24}$/)) } },
                { title: { $in: courseNames } },
                { slug: { $in: courseNames.map(name => (name || '').toLowerCase().replace(/\s+/g, '-')) } }
            ]
        }).lean();

        const courseDetails = enrollDocs.map((e) => {
            const course = matchedCourses.find(c => 
                (e.courseId && String(c._id) === String(e.courseId)) ||
                c.title === e.courseName ||
                c.slug === (e.courseName || '').toLowerCase().replace(/\s+/g, '-')
            );
            const p = allProgress.find(ap => String(ap.courseId) === String(e.courseId) || (course && String(ap.courseId) === String(course._id)));
            return {
                id: course ? course._id : e.courseId,
                title: course ? course.title : e.courseName,
                thumbnail: course ? course.thumbnail : '',
                progress: p ? (p.progressPercent || 0) : 0,
                lastWatched: p ? p.updatedAt : e.purchaseDate
            };
        });

        // 5. Performance Graph (last 10 tests)
        const perfData = testResults.slice(0, 10).reverse();
        const performanceGraph = {
            labels: perfData.map(t => new Date(t.timestamp).toLocaleDateString()),
            data: perfData.map(t => t.score)
        };

        // 6. Topic Analysis
        const subjectStats = {};
        testResults.forEach(res => {
            const sub = res.courseName || 'General';
            if (!subjectStats[sub]) subjectStats[sub] = { total: 0, count: 0 };
            subjectStats[sub].total += res.score;
            subjectStats[sub].count += 1;
        });

        const weakTopics = Object.keys(subjectStats)
            .map(sub => ({
                topic: sub,
                avgScore: Math.round(subjectStats[sub].total / subjectStats[sub].count)
            }))
            .filter(t => t.avgScore < 50)
            .sort((a,b) => a.avgScore - b.avgScore);

        // 7. Final Response Object
        res.json({
            ok: true,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                avatar: user.picture, 
                points: user.points, 
                rank: user.rank 
            },
            stats: {
                totalCourses: enrollDocs.length,
                totalTestsTaken: totalTests,
                totalTime: analytics.totalTimeSpent,
                streak: analytics.learningStreak,
                avgScore,
                accuracy,
                points: user.points || 0,
                rank: user.rank || 0,
                marketplace: {
                    listed: mktListed,
                    sold: mktSold,
                    purchased: mktPurchased,
                    earnings: mktEarnings
                }
            },
            performanceGraph,
            weakTopics,
            courses: courseDetails.sort((a,b) => new Date(b.lastWatched) - new Date(a.lastWatched)),
            mockTestAccess: user.purchasedMockTest === true || user.hasMockSeriesAccess === true,
            books: user.purchasedBooks || [],
            recentActivities: await Activity.find({ userId: queryUserId }).sort({ timestamp: -1 }).limit(10)
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────

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
        const now = new Date();
        const lastActive = new Date(analytics.lastActiveDate);
        const lastDateStr = lastActive.toISOString().split('T')[0];

        if (lastDateStr !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDateStr === yesterdayStr) {
                // Consecutive day
                analytics.learningStreak += 1;
                if (analytics.learningStreak > (analytics.longestStreak || 0)) {
                    analytics.longestStreak = analytics.learningStreak;
                }
            } else {
                // Break in streak (> 1 day gap)
                analytics.learningStreak = 1;
            }
        } else if (analytics.learningStreak === 0) {
            // First time activity ever or previously reset
            analytics.learningStreak = 1;
        }

        analytics.lastActiveDate = now;

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
