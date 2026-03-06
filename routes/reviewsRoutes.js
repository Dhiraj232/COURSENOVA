/**
 * REVIEWS API ROUTES
 * Book reviews and ratings
 */

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Book = require('../models/Book');

// Middleware to check authentication
const authMiddleware = (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Not authenticated' });
    next();
};

// ─────────────────────────────────────────────────────────
// POST /api/reviews - Create review (verified buyers only)
// ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { bookId, rating, title, comment } = req.body;

        // Validation
        if (!bookId || !rating || !title || !comment) {
            return res.status(400).json({ ok: false, message: 'Missing required fields' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ ok: false, message: 'Rating must be between 1 and 5' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ ok: false, message: 'Book not found' });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ bookId, buyerId: req.user.id });
        if (existingReview) {
            return res.status(400).json({ ok: false, message: 'You have already reviewed this book' });
        }

        const review = new Review({
            bookId,
            buyerId: req.user.id,
            rating,
            title,
            comment,
            verified: true // Assuming JWT auth = verified buyer
        });

        await review.save();

        // Update book review stats
        const allReviews = await Review.find({ bookId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        book.reviews.averageRating = Math.round(avgRating * 10) / 10;
        book.reviews.totalReviews = allReviews.length;
        book.reviews.reviewsList.push(review._id);

        await book.save();

        res.status(201).json({
            ok: true,
            message: 'Review posted successfully',
            review
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reviews/book/:bookId - Get all reviews for a book
// ─────────────────────────────────────────────────────────
router.get('/book/:bookId', async (req, res) => {
    try {
        const reviews = await Review.find({ bookId: req.params.bookId })
            .populate('buyerId', 'name picture')
            .sort({ createdAt: -1 });

        res.json({ ok: true, reviews });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/reviews/:reviewId - Edit own review
// ─────────────────────────────────────────────────────────
router.put('/:reviewId', authMiddleware, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);

        if (!review) {
            return res.status(404).json({ ok: false, message: 'Review not found' });
        }

        if (review.buyerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        const { rating, title, comment } = req.body;

        if (rating) review.rating = rating;
        if (title) review.title = title;
        if (comment) review.comment = comment;

        review.updatedAt = new Date();
        await review.save();

        res.json({ ok: true, message: 'Review updated', review });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/reviews/:reviewId - Delete own review
// ─────────────────────────────────────────────────────────
router.delete('/:reviewId', authMiddleware, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);

        if (!review) {
            return res.status(404).json({ ok: false, message: 'Review not found' });
        }

        if (review.buyerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        await Review.findByIdAndDelete(req.params.reviewId);

        // Update book stats
        const allReviews = await Review.find({ bookId: review.bookId });
        if (allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            await Book.findByIdAndUpdate(
                review.bookId,
                {
                    'reviews.averageRating': Math.round(avgRating * 10) / 10,
                    'reviews.totalReviews': allReviews.length
                }
            );
        }

        res.json({ ok: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/reviews/:reviewId/helpful - Mark review as helpful
// ─────────────────────────────────────────────────────────
router.post('/:reviewId/helpful', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.reviewId,
            { $inc: { helpful: 1 } },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ ok: false, message: 'Review not found' });
        }

        res.json({ ok: true, helpful: review.helpful });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
