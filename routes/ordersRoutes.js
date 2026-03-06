/**
 * ORDERS API ROUTES
 * Order management, tracking, and returns
 */

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Book = require('../models/Book');

// Middleware to check authentication
const authMiddleware = (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Not authenticated' });
    next();
};

// ─────────────────────────────────────────────────────────
// POST /api/orders - Create order from cart (buyer)
// ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { items, delivery, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ ok: false, message: 'Cart is empty' });
        }

        // Validate delivery address
        if (!delivery || !delivery.recipientName || !delivery.phone || !delivery.street || !delivery.city || !delivery.pincode) {
            return res.status(400).json({ ok: false, message: 'Incomplete delivery address' });
        }

        // Verify stock and calculate totals
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const book = await Book.findById(item.bookId);
            
            if (!book) {
                return res.status(404).json({ ok: false, message: `Book ${item.bookId} not found` });
            }

            if (book.stock.availableQuantity < item.quantity) {
                return res.status(400).json({ 
                    ok: false, 
                    message: `Insufficient stock for ${book.title}` 
                });
            }

            const itemTotal = book.price.sellingPrice * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                bookId: book._id,
                bookTitle: book.title,
                quantity: item.quantity,
                pricePerUnit: book.price.sellingPrice,
                totalPrice: itemTotal,
                seller: {
                    sellerId: book.seller.sellerId,
                    sellerName: book.seller.sellerName
                }
            });

            // Decrease stock
            book.stock.availableQuantity -= item.quantity;
            await book.save();
        }

        // Create order
        const order = new Order({
            buyer: {
                buyerId: req.user.id,
                buyerName: req.user.name || 'Guest',
                buyerEmail: req.user.email,
                buyerPhone: delivery.phone
            },
            items: orderItems,
            pricing: {
                totalAmount,
                discount: 0,
                tax: 0,
                finalAmount: totalAmount
            },
            payment: {
                method: paymentMethod || 'COD',
                status: paymentMethod === 'COD' ? 'pending' : 'pending'
            },
            delivery: {
                address: delivery
            },
            status: {
                current: 'order_placed',
                timeline: [
                    {
                        status: 'order_placed',
                        timestamp: new Date(),
                        note: 'Order successfully placed'
                    }
                ]
            }
        });

        await order.save();

        // Clear cart
        await Cart.findOneAndDelete({ userId: req.user.id });

        res.status(201).json({
            ok: true,
            message: 'Order created successfully',
            order,
            orderNumber: order.orderNumber
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/orders - Get user's orders (buyer)
// ─────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ 'buyer.buyerId': req.user.id })
            .sort({ createdAt: -1 })
            .populate('items.bookId', 'title price images')
            .populate('items.seller.sellerId', 'businessName');

        res.json({ ok: true, orders });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/orders/:orderId - Get order details
// ─────────────────────────────────────────────────────────
router.get('/:orderId', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('items.bookId', 'title price images')
            .populate('items.seller.sellerId', 'businessName contactInfo');

        if (!order) {
            return res.status(404).json({ ok: false, message: 'Order not found' });
        }

        // Check if user owns this order
        if (order.buyer.buyerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        res.json({ ok: true, order });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/orders/:orderId/status - Update order status (seller only)
// ─────────────────────────────────────────────────────────
router.put('/:orderId/status', authMiddleware, async (req, res) => {
    try {
        const { status, note } = req.body;

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ ok: false, message: 'Order not found' });
        }

        // Verify seller owns at least one item in order
        const sellerItems = order.items.filter(item => 
            item.seller.sellerId.toString() === req.user.id.toString()
        );

        if (sellerItems.length === 0 && order.buyer.buyerId.toString() !== req.user.id) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        order.status.current = status;
        order.status.timeline.push({
            status,
            timestamp: new Date(),
            note: note || ''
        });

        if (status === 'shipped') {
            order.delivery.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        } else if (status === 'delivered') {
            order.delivery.actualDelivery = new Date();
        }

        order.updatedAt = new Date();
        await order.save();

        res.json({ ok: true, message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/orders/:orderId/return - Request return (buyer)
// ─────────────────────────────────────────────────────────
router.post('/:orderId/return', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;

        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            return res.status(404).json({ ok: false, message: 'Order not found' });
        }

        if (order.buyer.buyerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        if (order.status.current !== 'delivered') {
            return res.status(400).json({ ok: false, message: 'Can only return delivered orders' });
        }

        order.return = {
            status: 'requested',
            reason: reason || '',
            requestedAt: new Date()
        };

        await order.save();

        res.json({ ok: true, message: 'Return requested successfully', order });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
