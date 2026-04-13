const User = require('../models/User');
const CommunityLeaderboard = require('../models/CommunityLeaderboard');

/**
 * Shared utility to award points and update leaderboards
 */
async function awardPoints(userId, points, type) {
    try {
        // 1. Update User Model (Main source of truth for Dashboard)
        const user = await User.findByIdAndUpdate(userId, { $inc: { points } }, { new: true });
        if (!user) return;

        // 2. Update CommunityLeaderboard for the ranking system
        const update = { $inc: { points } };
        if (type === 'post') update.$inc.posts = 1;
        if (type === 'answer') update.$inc.answers = 1;
        if (type === 'best_answer') update.$inc.bestAnswers = 1;
        if (type === 'test') update.$inc.testsTaken = 1;

        await CommunityLeaderboard.findOneAndUpdate(
            { userId },
            { ...update, username: user.name, lastUpdated: new Date() },
            { upsert: true, new: true }
        );
        
        // 3. Recalculate ranks (simplified background process)
        // In a high-traffic app, this would be a cron job or Redis-backed sorted set
        const all = await CommunityLeaderboard.find().sort({ points: -1 }).limit(100);
        for(let i=0; i<all.length; i++) {
            await User.findByIdAndUpdate(all[i].userId, { rank: i + 1 });
        }

        console.log(`✨ [Gamification] User ${userId} earned +${points} for ${type}`);
        
        // 4. Emit real-time notification if IO available
        if (global.io) {
            global.io.to(`user:${userId}`).emit('dashboard_update', {
                type: 'POINTS_EARNED',
                points: points,
                total: user.points,
                message: `You earned +${points} pts for ${type}!`
            });
        }

        return user.points;
    } catch (err) {
        console.error('Points award error:', err);
    }
}

module.exports = { awardPoints };
