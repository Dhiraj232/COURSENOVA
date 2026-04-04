const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Doubt = require('../models/Doubt');
const Comment = require('../models/Comment');
const Follower = require('../models/Follower');
const CommunityLeaderboard = require('../models/CommunityLeaderboard');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// Utility to update leaderboard points
async function updatePoints(userId, username, points, type) {
    try {
        const update = { $inc: { points } };
        if (type === 'post') update.$inc.posts = 1;
        if (type === 'answer') update.$inc.answers = 1;

        await CommunityLeaderboard.findOneAndUpdate(
            { userId },
            { ...update, username, lastUpdated: new Date() },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('Leaderboard update error:', err);
    }
}

// ─── POSTS / FORUM ──────────────────────────────────────────────

// Get trending posts
router.get('/posts/trending', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ views: -1, likesCount: -1, commentsCount: -1 })
            .limit(10);
        res.json({ ok: true, posts });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Get recent posts with pagination/category filter
router.get('/posts', async (req, res) => {
    const { category, page = 1, limit = 10 } = req.query;
    const query = {};
    if (category && category !== 'All') query.category = category;

    try {
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json({ ok: true, posts });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Create post
router.post('/posts', requireAuth, async (req, res) => {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
        return res.status(400).json({ ok: false, message: 'Title, category, and content are required' });
    }

    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        const post = new Post({
            userId: req.userId,
            username: user.name,
            userPicture: user.picture,
            title,
            content,
            category
        });
        await post.save();

        // Update points: 10 points for creating a post
        await updatePoints(req.userId, user.name, 10, 'post');

        if (req.app.get('io')) req.app.get('io').emit('new_post', post);

        res.json({ ok: true, post });
    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ ok: false, message: 'Failed to create post', error: err.message });
    }
});

// Alias for singular post
// Alias for singular post — forward to main handler
router.post('/post', (req, res, next) => { req.url = '/posts'; next(); }, router.post);

// Get comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: -1 });
        res.json({ ok: true, comments });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch comments' });
    }
});

// Add a comment to a post
router.post('/posts/:postId/comments', requireAuth, async (req, res) => {
    const { text } = req.body;
    try {
        const user = await User.findById(req.userId);
        const comment = new Comment({
            postId: req.params.postId,
            userId: req.userId,
            username: user.name,
            userPicture: user.picture,
            text
        });
        await comment.save();

        // Increment comment count on post
        await Post.findByIdAndUpdate(req.params.postId, { $inc: { commentsCount: 1 } });

        // Update points: 5 points for commenting
        await updatePoints(req.userId, user.name, 5);

        if (req.app.get('io')) req.app.get('io').emit('new_comment', { postId: req.params.postId, comment });

        res.json({ ok: true, comment });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to add comment' });
    }
});

// Like post
router.post('/posts/:postId/like', requireAuth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ ok: false, message: 'Post not found' });

        const isLiked = post.likes.includes(req.userId);
        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== req.userId);
            post.likesCount--;
        } else {
            post.likes.push(req.userId);
            post.likesCount++;

            // Create notification for the post author
            if (post.userId.toString() !== req.userId) {
                const sender = await User.findById(req.userId);
                await (new Notification({
                    recipientId: post.userId,
                    senderId: req.userId,
                    senderName: sender.name,
                    type: 'like',
                    referenceId: post._id,
                    message: `${sender.name} liked your post: ${post.title.substring(0, 20)}...`
                })).save();

                // Reward post author: 2 points for receiving a like
                const postAuthor = await User.findById(post.userId);
                await updatePoints(post.userId, postAuthor.name, 2);
            }
        }
        await post.save();
        if (req.app.get('io')) req.app.get('io').emit('like_update', { postId: post._id, likesCount: post.likesCount });
        res.json({ ok: true, likesCount: post.likesCount, isLiked: !isLiked });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Like failed' });
    }
});

// ─── DOUBTS ────────────────────────────────────────────────────

// Get recent doubts
router.get('/doubts', async (req, res) => {
    try {
        const doubts = await Doubt.find().sort({ createdAt: -1 }).limit(20);
        res.json({ ok: true, doubts });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Ask doubt
router.post('/doubts', requireAuth, async (req, res) => {
    const { question, details } = req.body;
    try {
        const user = await User.findById(req.userId);
        const doubt = new Doubt({
            userId: req.userId,
            username: user.name,
            userPicture: user.picture,
            question,
            details
        });
        await doubt.save();
        if (req.app.get('io')) req.app.get('io').emit('new_doubt', doubt);
        res.json({ ok: true, doubt });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to post doubt' });
    }
});

// Alias for singular doubt
router.post('/doubt', requireAuth, async (req, res) => {
    const { question, details } = req.body;
    try {
        const user = await User.findById(req.userId);
        const doubt = new Doubt({
            userId: req.userId,
            username: user.name,
            userPicture: user.picture,
            question,
            details
        });
        await doubt.save();
        res.json({ ok: true, doubt });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to post doubt' });
    }
});

// Answer doubt
router.post('/doubts/:doubtId/answer', requireAuth, async (req, res) => {
    const { answer } = req.body;
    try {
        const doubt = await Doubt.findById(req.params.doubtId);
        if (!doubt) return res.status(404).json({ ok: false, message: 'Doubt not found' });

        const user = await User.findById(req.userId);
        const ansObj = {
            userId: req.userId,
            username: user.name,
            userPicture: user.picture,
            answer,
            isInstructor: user.role === 'instructor' || user.role === 'admin'
        };
        doubt.answers.push(ansObj);
        await doubt.save();

        // Notify user who asked
        if (doubt.userId.toString() !== req.userId) {
            await (new Notification({
                recipientId: doubt.userId,
                senderId: req.userId,
                senderName: user.name,
                type: 'answer',
                referenceId: doubt._id,
                message: `${user.name} answered your doubt: ${doubt.question.substring(0, 20)}...`
            })).save();

            // Reward answerer: 15 points for answering a doubt
            await updatePoints(req.userId, user.name, 15, 'answer');
        }

        if (req.app.get('io')) req.app.get('io').emit('new_answer', { doubtId: doubt._id, answers: doubt.answers });

        res.json({ ok: true, answers: doubt.answers });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to answer' });
    }
});

// ─── LEADERBOARD ───────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
    try {
        const entries = await CommunityLeaderboard.find().sort({ points: -1 }).limit(10);
        res.json({ ok: true, entries });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// ─── FOLLOW SYSTEM ──────────────────────────────────────────────

router.post('/follow/:followingId', requireAuth, async (req, res) => {
    try {
        if (req.params.followingId === req.userId) {
            return res.status(400).json({ ok: false, message: 'Cannot follow yourself' });
        }

        const existing = await Follower.findOne({
            followerId: req.userId,
            followingId: req.params.followingId
        });

        if (existing) {
            await Follower.deleteOne({ _id: existing._id });
            res.json({ ok: true, following: false });
        } else {
            await (new Follower({
                followerId: req.userId,
                followingId: req.params.followingId
            })).save();

            // Notify other user
            const sender = await User.findById(req.userId);
            await (new Notification({
                recipientId: req.params.followingId,
                senderId: req.userId,
                senderName: sender.name,
                type: 'follow',
                message: `${sender.name} started following you!`
            })).save();

            res.json({ ok: true, following: true });
        }
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Follow failed' });
    }
});

// ─── NOTIFICATIONS ──────────────────────────────────────────────

router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const notifs = await Notification.find({ recipientId: req.userId })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ ok: true, notifications: notifs });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

router.post('/notifications/mark-read', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany({ recipientId: req.userId }, { isRead: true });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

module.exports = router;
