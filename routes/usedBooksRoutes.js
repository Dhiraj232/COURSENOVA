/**
 * USED BOOKS MARKETPLACE — API ROUTES
 * Simple CRUD for user-to-user book listings with Multer image upload.
 * Any logged-in user can list, edit, and delete their own books.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const UsedBook = require('../models/UsedBook');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

// ─── Multer — save images to /uploads/books/ ─────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'books'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `book_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'), false);
    }
});

// ─── Auth helper ─────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ ok: false, message: 'Login required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId || decoded.id;
        req.userEmail = decoded.email || '';
        req.userName = decoded.name || '';
        next();
    } catch (e) {
        return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
}

// ─── Ensure upload directory exists ──────────────────────────────────────────
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads', 'books');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/used-books/my  — current user's own listings
// ──────────────────────────────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req, res) => {
    try {
        const books = await UsedBook.find({ sellerId: req.userId }).sort({ createdAt: -1 });
        res.json({ ok: true, books });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/used-books  — all active books with optional filters
// Query: search, category, maxPrice, minPrice, location, page, limit
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { search, category, maxPrice, minPrice, location, condition, page = 1, limit = 20 } = req.query;

        let filter = { status: 'active' };

        if (search) {
            // Use regex for search (text index also works but regex is simpler for partial match)
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category && category !== 'all') filter.category = category;
        if (condition && condition !== 'all') filter.condition = condition;
        if (location) filter.location = { $regex: location, $options: 'i' };
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const books = await UsedBook.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
        const total = await UsedBook.countDocuments(filter);

        res.json({ ok: true, books, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/used-books/:id — single book
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        res.json({ ok: true, book });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/used-books/add — create a new listing (auth required)
// ──────────────────────────────────────────────────────────────────────────────
router.post('/add', requireAuth, upload.single('image'), async (req, res) => {
    try {
        console.log("Incoming used book add request body:", req.body);
        if (!req.body) {
            return res.status(400).json({ ok: false, message: "No data provided" });
        }
        const { title, author, category, condition, price, description, location, contactNumber } = req.body;

        if (!title || !author || !price) {
            return res.status(400).json({ ok: false, message: 'Title, author and price are required' });
        }

        const userId = req.userId;
        // Pull user info from DB for sellerName & email (or use token payload fallback)
        let sellerName = req.userName || 'Anonymous';
        let sellerEmail = req.userEmail || '';

        try {
            const User = require('../models/User');
            const user = await User.findById(userId).select('name email');
            if (user) { 
                sellerName = user.name || sellerName; 
                sellerEmail = user.email || sellerEmail; 
            }
        } catch (_) { /* use fallback */ }

        const imageFilename = req.file ? req.file.filename : '';

        const book = new UsedBook({
            title,
            author,
            category: category || 'Other',
            condition: condition || 'Good',
            price: Number(price),
            description: description || '',
            image: imageFilename,
            location: location || '',
            contactNumber: contactNumber || '',
            sellerId: userId,
            sellerName,
            sellerEmail,
            status: 'active'
        });

        await book.save();
        res.status(201).json({ ok: true, success: true, message: 'Book listed successfully!', book });
    } catch (err) {
        console.error("Store Add Used Book Error:", err);
        res.status(500).json({
            ok: false,
            message: 'Could not list book',
            error: err.message
        });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/used-books/:id — update own book
// ──────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.sellerId.toString() !== req.userId.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only edit your own listings' });
        }

        const allowed = ['title', 'author', 'category', 'condition', 'price', 'description', 'location', 'contactNumber', 'status'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) book[field] = req.body[field];
        });

        if (req.body.price) book.price = Number(req.body.price);
        if (req.file) book.image = req.file.filename;

        await book.save();
        res.json({ ok: true, message: 'Book updated', book });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/used-books/:id — delete own book
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.sellerId.toString() !== req.userId.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only delete your own listings' });
        }

        // Delete image file if it exists
        if (book.image) {
            const imgPath = path.join(__dirname, '..', 'uploads', 'books', book.image);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        await UsedBook.findByIdAndDelete(req.params.id);
        res.json({ ok: true, message: 'Book removed' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/used-books/:id/sold — mark own book as sold (or re-activate)
// ──────────────────────────────────────────────────────────────────────────────
router.patch('/:id/sold', requireAuth, async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.sellerId.toString() !== req.userId.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only update your own listings' });
        }
        // Toggle between sold and active
        book.status = book.status === 'sold' ? 'active' : 'sold';
        await book.save();
        res.json({ ok: true, message: book.status === 'sold' ? 'Marked as sold' : 'Relisted as active', status: book.status });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
