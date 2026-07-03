const express = require('express');
const router = express.Router();
const PracticeQuestion = require('../models/PracticeQuestion');
const MockTestPack = require('../models/MockTestPack');
const Transaction = require('../models/Transaction');
const TestResult = require('../models/TestResult');
const { requireAuth } = require('../middleware/auth');
const { checkAccess } = require('../utils/accessControl');

// ── 1. GET Test Categories ──────────────────────────────────────────────
router.get('/categories', (req, res) => {
    const categories = {
        "School Classes": ["Class 9", "Class 10", "Class 11", "Class 12"],
        "Competitive Exams": ["JEE Main", "NEET", "SSC", "CUET", "UPSC", "Banking"]
    };
    const subjectMap = {
        "Class 9": ["Mathematics", "Science", "English", "Social Science"],
        "Class 10": ["Mathematics", "Science", "English", "Social Science"],
        "Class 11": ["Physics", "Chemistry", "Mathematics", "Biology"],
        "Class 12": ["Physics", "Chemistry", "Mathematics", "Biology"],
        "JEE Main": ["Physics", "Chemistry", "Mathematics"],
        "NEET": ["Physics", "Chemistry", "Biology"],
        "SSC": ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
        "CUET": ["Section I (Languages)", "Section II (Domain)", "Section III (General)"],
        "UPSC": ["History", "Geography", "Polity", "Economy", "CSAT"],
        "Banking": ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"]
    };
    res.json({ ok: true, categories, subjects: subjectMap });
});

// ── 2. GET Questions for Practice ───────────────────────────────────────
router.get('/questions', async (req, res) => {
    const { category, subject, limit = 20 } = req.query;
    try {
        const questions = await PracticeQuestion.find({ category, subject }).limit(parseInt(limit));
        // If empty, return a friendly message or fallback
        res.json({ ok: true, questions });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Questions fetch failed' });
    }
});

// ── 3. GET Mock Test Packs ──────────────────────────────────────────────
router.get('/packs', async (req, res) => {
    const { category } = req.query;
    try {
        const filter = { isActive: true };
        if (category) filter.category = category;
        const packs = await MockTestPack.find(filter);
        res.json({ ok: true, packs });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Packs fetch failed' });
    }
});

// ── 4. GET Single Pack Details (Unlocks locked tests if paid) ────────────
router.get('/packs/:id', requireAuth, async (req, res) => {
    try {
        const pack = await MockTestPack.findOne({ id: req.params.id }).populate('tests.questions');
        if (!pack) return res.status(404).json({ ok: false, message: 'Pack not found' });

        // Check if user has access using unified utility
        const hasAccess = await checkAccess(req.userId, pack.id);

        if (!hasAccess) {
            // Return limited info
            return res.json({ ok: true, pack: { ...pack._doc, tests: pack.tests.map(t => ({ testId: t.testId, testTitle: t.testTitle, locked: true })) }, locked: true });
        }

        res.json({ ok: true, pack, locked: false });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Error fetching pack' });
    }
});

// ── 5. Submit Mock Test Result ──────────────────────────────────────────
router.post('/submit', requireAuth, async (req, res) => {
    const { testId, packId, score, total, correct, incorrect, unattempted, timeSpentSec } = req.body;
    try {
        const correctCount = Number(correct) || 0;
        const incorrectCount = Number(incorrect) || 0;
        const totalCount = Number(total) || 1;
        const unattemptedCount = unattempted !== undefined ? Number(unattempted) : (totalCount - correctCount - incorrectCount);
        
        // Calculate raw obtained marks with negative marking (-0.25)
        const rawScore = (correctCount * 1.0) - (incorrectCount * 0.25);
        const scorePercent = (rawScore / totalCount) * 100;
        const accuracyVal = (correctCount / (correctCount + incorrectCount || 1)) * 100;

        const result = await TestResult.create({
            userId: req.userId,
            courseId: testId,
            courseName: packId, // Using packId for grouping analysis
            score: scorePercent, // percentage score for dashboard and progress charts
            accuracy: accuracyVal,
            passed: scorePercent >= 40, // 40% pass criteria for practice
            totalQuestions: totalCount,
            correctQuestions: correctCount,
            incorrectQuestions: incorrectCount,
            unattemptedQuestions: unattemptedCount,
            topic: 'Mock Test Attempt',
            timestamp: new Date()
        });

        // Log Activity for Dashboard
        const Activity = require('../models/Activity');
        await Activity.create({
            userId: req.userId,
            type: scorePercent >= 40 ? 'test_passed' : 'test_failed',
            title: `Attempted: ${packId} (${testId})`,
            score: scorePercent
        });

        // Award points: +20 for test attempt (as per new rules)
        const { awardPoints } = require('../utils/gamification');
        await awardPoints(req.userId, 20, 'test');

        res.json({ ok: true, result });

        // ── Real-time Dashboard Update ──
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${req.userId}`).emit('dashboard_update', {
                type: 'TEST_COMPLETE',
                title: packId,
                score: scorePercent,
                passed: scorePercent >= 40,
                message: `Finished ${packId} with ${scorePercent.toFixed(1)}% (Marks: ${rawScore.toFixed(2)}/${totalCount})`
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: 'Submission failed' });
    }
});

module.exports = router;
