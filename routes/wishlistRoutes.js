/**
 * WISHLIST API ROUTES
 * Save books to wishlist
 */

const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');

const { requireAuth } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// GET /api/wishlist - Get user's wishlist
// ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.user.id })
            .populate('items.bookId', 'title author price images reviews');

        if (!wishlist) {
            wishlist = new Wishlist({ userId: req.user.id, items: [] });
        }

        res.json({ ok: true, wishlist });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/wishlist/:bookId - Add to wishlist
// ─────────────────────────────────────────────────────────
router.post('/:bookId', requireAuth, async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.user.id });

        if (!wishlist) {
            wishlist = new Wishlist({ userId: req.user.id, items: [] });
        }

        // Check if already in wishlist
        const exists = wishlist.items.some(item => item.bookId.toString() === req.params.bookId);

        if (!exists) {
            wishlist.items.push({
                bookId: req.params.bookId,
                notifyOnDiscount: false
            });
        }

        wishlist.totalItems = wishlist.items.length;
        await wishlist.save();

        res.json({ ok: true, message: 'Added to wishlist', wishlist });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/wishlist/:bookId - Remove from wishlist
// ─────────────────────────────────────────────────────────
router.delete('/:bookId', requireAuth, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user.id });

        if (!wishlist) {
            return res.status(404).json({ ok: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item => item.bookId.toString() !== req.params.bookId);
        wishlist.totalItems = wishlist.items.length;

        await wishlist.save();

        res.json({ ok: true, message: 'Removed from wishlist', wishlist });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/wishlist/:bookId/notify - Enable price drop notifications
// ─────────────────────────────────────────────────────────
router.post('/:bookId/notify', requireAuth, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.user.id });

        if (!wishlist) {
            return res.status(404).json({ ok: false, message: 'Wishlist not found' });
        }

        const item = wishlist.items.find(i => i.bookId.toString() === req.params.bookId);

        if (!item) {
            return res.status(404).json({ ok: false, message: 'Book not in wishlist' });
        }

        item.notifyOnDiscount = true;
        await wishlist.save();

        res.json({ ok: true, message: 'Notifications enabled for price drops' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
