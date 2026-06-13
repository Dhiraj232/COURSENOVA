const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

// POST /api/feedback - Submit new feedback
router.post('/', optionalAuth, async (req, res) => {
    try {
        const { rating, message, name } = req.body;
        
        if (!rating || !message || !name) {
            return res.status(400).json({ ok: false, message: 'Rating, name and message are required' });
        }

        const feedback = new Feedback({
            userId: req.userId || null,
            name,
            rating: Number(rating),
            message
        });

        await feedback.save();
        res.json({ ok: true, message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Feedback POST error:', error);
        res.status(500).json({ ok: false, message: 'Server error while submitting feedback' });
    }
});

// GET /api/feedback - Get recent feedbacks to display on frontend (optional)
router.get('/', async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(10).lean();
        res.json({ ok: true, feedbacks });
    } catch (error) {
        console.error('Feedback GET error:', error);
        res.status(500).json({ ok: false, message: 'Server error fetching feedbacks' });
    }
});

// GET /api/feedback/admin - Get all feedbacks for admin
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 }).lean();
        res.json({ ok: true, feedbacks });
    } catch (error) {
        console.error('Admin Feedback GET error:', error);
        res.status(500).json({ ok: false, message: 'Server error fetching feedbacks' });
    }
});

// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);
        if (!feedback) {
            return res.status(404).json({ ok: false, message: 'Feedback not found' });
        }
        res.json({ ok: true, message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Admin Feedback DELETE error:', error);
        res.status(500).json({ ok: false, message: 'Server error deleting feedback' });
    }
});

module.exports = router;
