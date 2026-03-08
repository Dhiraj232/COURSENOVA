const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const CodingProblem = require('../models/CodingProblem');
const PracticeLeaderboard = require('../models/Leaderboard');
const { requireAuth } = require('../middleware/auth');

// Support both authenticated and guest access for some routes, 
// but require items like leaderboard updates to be authenticated.

// ── MCQ PRACTICE ─────────────────────────────────────────────────────────────

// Get random questions by category and difficulty
router.get('/questions', async (req, res) => {
    const { category, difficulty, limit = 10 } = req.query;
    try {
        let query = {};
        if (category && category !== 'All') query.category = category;
        if (difficulty && difficulty !== 'All') query.difficulty = difficulty;

        const questions = await Question.aggregate([
            { $match: query },
            { $sample: { size: parseInt(limit) } }
        ]);

        res.json({ ok: true, questions });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch questions' });
    }
});

// ── CODING PRACTICE ──────────────────────────────────────────────────────────

// Get coding problems
router.get('/coding-problems', async (req, res) => {
    const { difficulty } = req.query;
    try {
        let query = {};
        if (difficulty && difficulty !== 'All') query.difficulty = difficulty;

        const problems = await CodingProblem.find(query);
        res.json({ ok: true, problems });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch coding problems' });
    }
});

// Submit code solution (Simplified evaluation)
router.post('/submit-code', requireAuth, async (req, res) => {
    const { problemId, code } = req.body;
    try {
        const problem = await CodingProblem.findById(problemId);
        if (!problem) return res.status(404).json({ ok: false, message: 'Problem not found' });

        // In a real system, we'd run the code against test cases.
        // For now, we'll just check if it's not empty and maybe some basic keyword check.
        const passed = code.length > 20; // Very basic check

        res.json({
            ok: true,
            passed,
            message: passed ? 'Solution submitted successfully!' : 'Solution is too short or invalid.'
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to submit code' });
    }
});

// ── DAILY QUIZ & LEADERBOARD ─────────────────────────────────────────────────

// Get daily quiz (5 random questions)
router.get('/daily-quiz', async (req, res) => {
    try {
        const questions = await Question.aggregate([
            { $sample: { size: 5 } }
        ]);
        res.json({ ok: true, questions });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch daily quiz' });
    }
});

// Submit daily quiz results
router.post('/submit-quiz', requireAuth, async (req, res) => {
    const { score } = req.body;
    try {
        const User = require('../models/User');
        const user = await User.findById(req.userId);
        const username = user ? user.name : 'Learner';

        const entry = new PracticeLeaderboard({
            userId: req.userId,
            username: username,
            score,
            date: new Date().setHours(0, 0, 0, 0)
        });

        await entry.save();

        // ── DASHBOARD LOGGING ──
        const Activity = require('../models/Activity');
        await Activity.create({
            userId: req.userId,
            type: 'quiz_completed',
            title: 'Daily Quiz',
            score
        });

        res.json({ ok: true, message: 'Quiz score submitted!' });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ ok: false, message: 'Failed to update leaderboard' });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const today = new Date().setHours(0, 0, 0, 0);
        const entries = await PracticeLeaderboard.find({ date: today })
            .sort({ score: -1 })
            .limit(10);

        res.json({ ok: true, entries });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
