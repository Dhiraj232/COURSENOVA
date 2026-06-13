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
        req.userRole = decoded.role || '';
        req.user = decoded;
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
// GET /api/used-books  — all active books with Nearby Marketplace Logic
// Query: search, category, maxPrice, minPrice, location, lat, lng, radius, userCollege
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { 
            search, category, maxPrice, minPrice, location, condition, 
            lat, lng, radius = 5000, userCollege, college,
            page = 1, limit = 50 
        } = req.query;

        let filter = { status: 'active' };

        // 0. College Filter
        if (college) {
            filter.college = { $regex: college, $options: 'i' };
        }

        // 1. Location-based Filter (Haversine/2dsphere)
        if (lat && lng) {
            filter.location = {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius) // default 5km
                }
            };
        } else if (location) {
            filter.location_name = { $regex: location, $options: 'i' }; // Fallback for old string-based location
        }

        // 2. Standard Filters
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category && category !== 'all') filter.category = category;
        if (condition && condition !== 'all') filter.condition = condition;
        
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const limitVal = Number(limit);
        
        let books = [];
        let total = 0;

        if (!userCollege) {
            total = await UsedBook.countDocuments(filter);
            books = await UsedBook.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitVal)
                .lean();
        } else {
            const pipeline = [];
            
            // If nearSphere is used, we must use $geoNear as the very first stage in aggregation
            if (lat && lng) {
                const geoFilter = { ...filter };
                delete geoFilter.location; // handled by $geoNear
                
                pipeline.push({
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                        distanceField: "distance",
                        maxDistance: parseInt(radius),
                        query: geoFilter,
                        spherical: true
                    }
                });
            } else {
                pipeline.push({ $match: filter });
            }

            // Project/Add priority weight field
            pipeline.push({
                $addFields: {
                    collegePriority: {
                        $cond: [{ $eq: ["$college", userCollege] }, 0, 1]
                    }
                }
            });

            // Sort by college priority first, then distance or date
            const sortStage = { collegePriority: 1 };
            if (lat && lng) {
                sortStage.distance = 1;
            } else {
                sortStage.createdAt = -1;
            }
            pipeline.push({ $sort: sortStage });

            // Count total matches in pipeline
            const countPipeline = [...pipeline, { $count: "count" }];
            const countRes = await UsedBook.aggregate(countPipeline);
            total = countRes.length > 0 ? countRes[0].count : 0;

            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limitVal });

            books = await UsedBook.aggregate(pipeline);
        }

        res.json({ 
            ok: true, 
            books, 
            total, 
            page: Number(page), 
            pages: Math.ceil(total / limitVal) 
        });
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
// POST /api/used-books/add — create a new listing (Nearby Marketplace Version)
// ──────────────────────────────────────────────────────────────────────────────
router.post('/add', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { 
            title, author, category, condition, price, description, 
            college, lat, lng, contactNumber, whatsapp 
        } = req.body;

        if (!title || !author || !price || !college) {
            return res.status(400).json({ ok: false, message: 'Title, author, price, and College are required' });
        }

        const userId = req.userId;
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

        // Capture location
        const locationCoords = (lat && lng) ? [parseFloat(lng), parseFloat(lat)] : [0, 0];

        const book = new UsedBook({
            title,
            author,
            category: category || 'Other',
            condition: condition || 'Good',
            price: Number(price),
            description: description || '',
            image: imageFilename,
            college: college.trim(),
            location: {
                type: 'Point',
                coordinates: locationCoords
            },
            contactNumber: contactNumber || '',
            whatsapp: whatsapp || contactNumber || '',
            sellerId: userId,
            sellerName,
            sellerEmail,
            status: 'active'
        });

        await book.save();
        
        // Log Activity for Dashboard Feed
        try {
            const Activity = require('../models/Activity');
            await Activity.create({
                userId,
                type: 'book_uploaded',
                title: `Listed Book: ${book.title}`,
                description: `Added "${book.title}" to the marketplace for ₹${book.price}.`
            });
        } catch (e) { console.warn("Activity log skipped:", e.message); }

        res.status(201).json({ ok: true, success: true, message: 'Book listed successfully!', book });

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${userId}`).emit('dashboard_update', {
                type: 'BOOK_UPLOADED',
                title: book.title,
                message: `Book "${book.title}" is now live in the marketplace!`
            });
        }
    } catch (err) {
        console.error("Store Add Used Book Error:", err);
        res.status(500).json({ ok: false, message: 'Could not list book', error: err.message });
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

        const updates = req.body;
        const allowed = ['title', 'author', 'category', 'condition', 'price', 'description', 'college', 'contactNumber', 'whatsapp', 'status'];
        
        allowed.forEach(field => {
            if (updates[field] !== undefined) book[field] = updates[field];
        });

        if (updates.lat && updates.lng) {
            book.location = {
                type: 'Point',
                coordinates: [parseFloat(updates.lng), parseFloat(updates.lat)]
            };
        }

        if (req.file) book.image = req.file.filename;

        await book.save();
        res.json({ ok: true, message: 'Book updated', book });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/used-books/:id — delete own book (or admin delete)
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        
        // Owner or admin can delete
        if (book.sellerId.toString() !== req.userId.toString() && req.userRole !== 'admin') {
            return res.status(403).json({ ok: false, message: 'You can only delete your own listings' });
        }

        if (book.image) {
            const imgPath = path.join(__dirname, '..', 'uploads', 'books', book.image);
            if (fs.existsSync(imgPath)) {
                try {
                    fs.unlinkSync(imgPath);
                } catch (e) {
                    console.error("Failed to delete book image:", e);
                }
            }
        }

        await UsedBook.findByIdAndDelete(req.params.id);
        res.json({ ok: true, message: 'Book removed successfully' });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/used-books/:id/sold — Mark as sold + Calculate Commission
// ──────────────────────────────────────────────────────────────────────────────
router.patch('/:id/sold', requireAuth, async (req, res) => {
    try {
        const book = await UsedBook.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.sellerId.toString() !== req.userId.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only update your own listings' });
        }

        // Toggle between sold and active
        const newStatus = book.status === 'sold' ? 'active' : 'sold';
        book.status = newStatus;

        // Calculate commission on SOLD (5% or fixed ₹10)
        if (newStatus === 'sold') {
            const commission = Math.max(book.price * 0.05, 10);
            book.commission = commission;
        } else {
            book.commission = 0;
        }

        await book.save();
        res.json({ 
            ok: true, 
            message: newStatus === 'sold' ? `Marked as sold! Commission: ₹${book.commission}` : 'Relisted as active', 
            status: newStatus 
        });

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${req.userId}`).emit('dashboard_update', {
                type: newStatus === 'sold' ? 'BOOK_SOLD' : 'BOOK_RELISTED',
                title: book.title,
                message: newStatus === 'sold' ? `Congratulations! You sold "${book.title}"` : `Book "${book.title}" is active again.`
            });
        }
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
