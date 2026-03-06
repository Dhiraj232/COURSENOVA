/**
 * CART API ROUTES
 * Shopping cart management
 */

const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Book = require('../models/Book');

// Middleware to check authentication
const authMiddleware = (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Not authenticated' });
    next();
};

// ─────────────────────────────────────────────────────────
// GET /api/cart - Get user's cart
// ─────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');

        if (!cart) {
            cart = new Cart({ userId: req.user.id, items: [] });
        }

        res.json({ ok: true, cart });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/cart - Add book to cart
// ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ ok: false, message: 'Book not found' });
        }

        if (book.stock.availableQuantity < quantity) {
            return res.status(400).json({ ok: false, message: 'Insufficient stock' });
        }

        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            cart = new Cart({ userId: req.user.id, items: [] });
        }

        // Check if book already in cart
        const existingItem = cart.items.find(item => item.bookId.toString() === bookId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                bookId,
                quantity,
                priceAtAddTime: book.price.sellingPrice,
                seller: book.seller.sellerId
            });
        }

        // Recalculate totals
        let totalPrice = 0;
        for (const item of cart.items) {
            const bookData = await Book.findById(item.bookId);
            totalPrice += (bookData.price.sellingPrice * item.quantity);
        }

        cart.totalItems = cart.items.length;
        cart.totalPrice = totalPrice;

        await cart.save();

        res.json({ ok: true, message: 'Item added to cart', cart });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/cart/:bookId - Update quantity in cart
// ─────────────────────────────────────────────────────────
router.put('/:bookId', authMiddleware, async (req, res) => {
    try {
        const { quantity } = req.body;

        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ ok: false, message: 'Cart not found' });
        }

        const item = cart.items.find(i => i.bookId.toString() === req.params.bookId);
        if (!item) {
            return res.status(404).json({ ok: false, message: 'Item not in cart' });
        }

        const book = await Book.findById(req.params.bookId);
        if (quantity > book.stock.availableQuantity) {
            return res.status(400).json({ ok: false, message: 'Insufficient stock' });
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter(i => i.bookId.toString() !== req.params.bookId);
        } else {
            item.quantity = quantity;
        }

        // Recalculate totals
        let totalPrice = 0;
        for (const cartItem of cart.items) {
            const bookData = await Book.findById(cartItem.bookId);
            totalPrice += (bookData.price.sellingPrice * cartItem.quantity);
        }

        cart.totalItems = cart.items.length;
        cart.totalPrice = totalPrice;

        await cart.save();

        res.json({ ok: true, message: 'Cart updated', cart });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/cart/:bookId - Remove from cart
// ─────────────────────────────────────────────────────────
router.delete('/:bookId', authMiddleware, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ ok: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(i => i.bookId.toString() !== req.params.bookId);

        // Recalculate totals
        let totalPrice = 0;
        for (const item of cart.items) {
            const book = await Book.findById(item.bookId);
            totalPrice += (book.price.sellingPrice * item.quantity);
        }

        cart.totalItems = cart.items.length;
        cart.totalPrice = totalPrice;

        await cart.save();

        res.json({ ok: true, message: 'Item removed from cart', cart });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/cart - Clear entire cart
// ─────────────────────────────────────────────────────────
router.delete('/', authMiddleware, async (req, res) => {
    try {
        await Cart.findOneAndDelete({ userId: req.user.id });

        res.json({ ok: true, message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
