/**
 * CHATS API ROUTES
 * Buyer-seller messaging
 */

const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Seller = require('../models/Seller');

const { requireAuth } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// GET /api/chats - Get all conversations for user
// ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { 'participants.buyer': req.user.id },
                { 'participants.seller': req.user.id }
            ]
        })
        .populate('participants.buyer', 'name picture')
        .populate('participants.seller', 'businessName')
        .populate('participants.bookId', 'title images')
        .sort({ lastMessageTime: -1 });

        res.json({ ok: true, chats });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/chats - Start a new conversation
// ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const { sellerId, bookId, message } = req.body;

        if (!sellerId) {
            return res.status(400).json({ ok: false, message: 'sellerId is required' });
        }

        const seller = await Seller.findById(sellerId);
        if (!seller) {
            return res.status(404).json({ ok: false, message: 'Seller not found' });
        }

        // Prevent self-chat
        if (seller.userId.toString() === req.user.id.toString()) {
            return res.status(400).json({ ok: false, message: 'You cannot chat with yourself' });
        }

        // Check if conversation already exists
        let chat = await Chat.findOne({
            'participants.buyer': req.user.id,
            'participants.seller': seller._id
        });

        if (!chat) {
            const conversationId = `${req.user.id}-${sellerId}-${Date.now()}`;

            chat = new Chat({
                conversationId,
                participants: {
                    buyer: req.user.id,
                    seller: seller._id,
                    bookId: bookId || null
                },
                messages: [],
                status: 'active'
            });
        }

        // Add message if provided
        if (message) {
            chat.messages.push({
                senderId: req.user.id,
                senderType: 'buyer',
                message,
                timestamp: new Date(),
                isRead: false
            });

            chat.lastMessage = message;
            chat.lastMessageTime = new Date();
        }

        await chat.save();

        res.status(201).json({
            ok: true,
            message: 'Conversation started',
            chat
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
router.get('/:conversationId', requireAuth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.conversationId)
            .populate('participants.buyer', 'name picture')
            .populate('participants.seller', 'businessName contactInfo');

        if (!chat) {
            return res.status(404).json({ ok: false, message: 'Conversation not found' });
        }

        // Check if user is part of conversation
        const sellerDoc = await Seller.findOne({ userId: req.user.id });
        const isBuyer = chat.participants.buyer && chat.participants.buyer._id ? (chat.participants.buyer._id.toString() === req.user.id.toString()) : (chat.participants.buyer && chat.participants.buyer.toString() === req.user.id.toString());
        const isSeller = sellerDoc && chat.participants.seller && chat.participants.seller._id ? (chat.participants.seller._id.toString() === sellerDoc._id.toString()) : (chat.participants.seller && chat.participants.seller.toString() === sellerDoc._id.toString());

        if (!isBuyer && !isSeller) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        // Mark messages as read
        chat.messages.forEach(msg => {
            if (msg.senderId.toString() !== req.user.id.toString()) {
                msg.isRead = true;
            }
        });

        await chat.save();

        res.json({ ok: true, chat });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/chats/:conversationId/message - Send message
// ─────────────────────────────────────────────────────────
router.post('/:conversationId/message', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ ok: false, message: 'Message cannot be empty' });
        }

        const chat = await Chat.findById(req.params.conversationId);

        if (!chat) {
            return res.status(404).json({ ok: false, message: 'Conversation not found' });
        }

        if (chat.status === 'closed') {
            return res.status(400).json({ ok: false, message: 'This conversation is closed' });
        }

        // Determine sender type
        const sellerDoc = await Seller.findOne({ userId: req.user.id });
        const isBuyer = chat.participants.buyer.toString() === req.user.id.toString();
        const isSeller = sellerDoc && chat.participants.seller.toString() === sellerDoc._id.toString();

        if (!isBuyer && !isSeller) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        chat.messages.push({
            senderId: req.user.id,
            senderType: isBuyer ? 'buyer' : 'seller',
            message,
            timestamp: new Date(),
            isRead: false
        });

        chat.lastMessage = message;
        chat.lastMessageTime = new Date();

        await chat.save();

        res.json({ ok: true, message: 'Message sent', chat });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/chats/:conversationId - Mark as read
// ─────────────────────────────────────────────────────────
router.put('/:conversationId', requireAuth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.conversationId);

        if (!chat) {
            return res.status(404).json({ ok: false, message: 'Conversation not found' });
        }

        // Mark all messages from other user as read
        chat.messages.forEach(msg => {
            if (msg.senderId.toString() !== req.user.id.toString()) {
                msg.isRead = true;
            }
        });

        await chat.save();

        res.json({ ok: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/chats/:conversationId - Close conversation
// ─────────────────────────────────────────────────────────
router.delete('/:conversationId', requireAuth, async (req, res) => {
    try {
        const { reason } = req.body;

        const chat = await Chat.findById(req.params.conversationId);

        if (!chat) {
            return res.status(404).json({ ok: false, message: 'Conversation not found' });
        }

        chat.status = 'closed';
        chat.closedAt = new Date();
        chat.closedReason = reason || 'Closed by user';

        await chat.save();

        res.json({ ok: true, message: 'Conversation closed' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
