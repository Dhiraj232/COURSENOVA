const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');

// Models
const Enrollment = require('../models/Enrollment');
const TestResult = require('../models/TestResult');
const Order = require('../models/Order');
const UsedBook = require('../models/UsedBook');
const Activity = require('../models/Activity');
const UserAnalytics = require('../models/UserAnalytics');
const StoreUser = require('../models/User');

/**
 * GET /api/dashboard
 * Production-ready dynamic dashboard endpoint.
 * Returns real-time user statistics and recent activity.
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const uidString = String(userId);
        
        // 1. Concurrent fetching for maximum performance
        const [
            user,
            totalCourses,
            totalTests,
            totalBooksBought,
            recentActivity,
            analytics,
            earningsResult,
            totalBooksSold,
            testResults
        ] = await Promise.all([
            StoreUser.findById(userId).select('name email picture points rank hasMockSeriesAccess purchasedMockTest'),
            Enrollment.countDocuments({ $or: [{ userId: userId }, { userId: uidString }] }),
            TestResult.countDocuments({ $or: [{ userId: userId }, { userId: uidString }] }),
            Order.countDocuments({ 
                $or: [{ 'buyer.buyerId': userId }, { 'buyer.buyerId': uidString }], 
                'payment.status': 'completed' 
            }),
            Activity.find({ userId }).sort({ timestamp: -1 }).limit(5),
            UserAnalytics.findOne({ userId }),
            UsedBook.aggregate([
                { $match: { sellerId: new mongoose.Types.ObjectId(uidString), status: 'sold' } },
                { $group: { _id: null, total: { $sum: "$price" } } }
            ]),
            UsedBook.countDocuments({ 
                sellerId: new mongoose.Types.ObjectId(uidString), 
                status: 'sold' 
            }),
            TestResult.find({ $or: [{ userId: userId }, { userId: uidString }] }).select('score')
        ]);

        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // 2. Process Statistics
        const totalBooksRevenue = earningsResult.length > 0 ? earningsResult[0].total : 0;
        
        // 3. Optional: Test Analysis (Average Score)
        const avgScore = testResults.length > 0 
            ? Math.round(testResults.reduce((acc, t) => acc + (t.score || 0), 0) / testResults.length) 
            : 0;

        // 4. Construct Final Response (Strictly matching user requirement)
        res.json({
            ok: true,
            user: {
                name: user.name,
                email: user.email,
                avatar: user.picture,
                points: user.points || 0,
                rank: user.rank || 0,
                mockTestAccess: user.purchasedMockTest === true || user.hasMockSeriesAccess === true
            },
            totalCourses,
            totalTests,
            totalBooksBought,
            totalBooksSold,
            totalBooksRevenue,
            recentActivity: recentActivity.map(act => ({
                id: act._id,
                type: act.type,
                title: act.title,
                timestamp: act.timestamp
            })),
            // Extended stats for extra UI premium feel
            stats: {
                streak: analytics?.learningStreak || 0,
                totalMinutes: analytics?.totalTimeSpent || 0,
                avgScore
            }
        });

    } catch (err) {
        console.error('[DashboardAPI] Error:', err);
        res.status(500).json({ ok: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
