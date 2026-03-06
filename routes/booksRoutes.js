/**
 * PROFESSIONAL BOOK STORE - BOOKS API ROUTES
 * Complete CRUD operations for books with search, filter, and recommendations
 */

const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Seller = require('../models/Seller');

// Middleware to check if user is seller
const isSellerMiddleware = async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ ok: false, message: 'Not authenticated' });
        
        const seller = await Seller.findOne({ userId: req.user.id, status: 'active' });
        if (!seller) return res.status(403).json({ ok: false, message: 'Not a seller' });
        
        req.seller = seller;
        next();
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────
// GET /api/books - Get all books with filters
// Query params: category, examType, priceMin, priceMax, rating, search, page, limit
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { category, examType, priceMin, priceMax, rating, search, page = 1, limit = 12 } = req.query;
        
        let filter = { status: 'active' };

        if (search) {
            filter.$text = { $search: search };
        }
        if (category) {
            filter.category = category;
        }
        if (examType) {
            filter.examType = examType;
        }
        if (priceMin || priceMax) {
            filter['price.sellingPrice'] = {};
            if (priceMin) filter['price.sellingPrice'].$gte = Number(priceMin);
            if (priceMax) filter['price.sellingPrice'].$lte = Number(priceMax);
        }
        if (rating) {
            filter['reviews.averageRating'] = { $gte: Number(rating) };
        }

        const skip = (page - 1) * limit;
        
        const books = await Book.find(filter)
            .populate('seller.sellerId', 'businessName metrics')
            .populate('reviews.reviewsList')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await Book.countDocuments(filter);

        res.json({
            ok: true,
            books,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/books/category/:category - Get books by category
// ─────────────────────────────────────────────────────────
router.get('/category/:category', async (req, res) => {
    try {
        const books = await Book.find({ 
            category: req.params.category, 
            status: 'active' 
        })
        .limit(20)
        .sort({ views: -1 });

        res.json({ ok: true, books });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/books/trending - Get bestselling books
// ─────────────────────────────────────────────────────────
router.get('/trending', async (req, res) => {
    try {
        const books = await Book.find({ status: 'active' })
            .sort({ views: -1, 'reviews.averageRating': -1 })
            .limit(12);

        res.json({ ok: true, books });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/books/new - Get newly added books
// ─────────────────────────────────────────────────────────
router.get('/new', async (req, res) => {
    try {
        const books = await Book.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .limit(8);

        res.json({ ok: true, books });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/books - Create new book (seller only)
// ─────────────────────────────────────────────────────────
router.post('/', isSellerMiddleware, async (req, res) => {
    try {
        const {
            title, author, edition, year, language, pages,
            category, examType, collegeRelevance,
            price, images, description, syllabus,
            stock, publishedDetails, tags, condition
        } = req.body;

        // Validation
        if (!title || !author || !category || !price?.mrp || !price?.sellingPrice) {
            return res.status(400).json({ 
                ok: false, 
                message: 'Missing required fields: title, author, category, price' 
            });
        }

        // Seller info
        const sellerInfo = {
            sellerId: req.seller._id,
            sellerType: req.seller.sellerType,
            sellerName: req.seller.businessInfo.businessName,
            contactNumber: req.seller.contactInfo.phoneNumber,
            email: req.seller.contactInfo.email,
            address: req.seller.address,
            collegeInstitute: req.seller.collegeInstitute,
            deliveryDays: 3
        };

        const newBook = new Book({
            title,
            author,
            edition: edition || '',
            year: year || new Date().getFullYear(),
            language: language || 'English',
            pages: pages || 0,
            category,
            examType: examType || '',
            collegeRelevance: collegeRelevance || [],
            price: {
                mrp: Number(price.mrp),
                sellingPrice: Number(price.sellingPrice),
                discount: Math.round(((price.mrp - price.sellingPrice) / price.mrp) * 100)
            },
            images: images || [],
            description: description || '',
            syllabus: syllabus || { chapters: [] },
            stock: {
                totalQuantity: stock?.totalQuantity || 1,
                availableQuantity: stock?.availableQuantity || 1,
                reorderLevel: stock?.reorderLevel || 5
            },
            seller: sellerInfo,
            publishedDetails: publishedDetails || {},
            tags: tags || [],
            condition: condition || 'Used',
            status: 'active'
        });

        await newBook.save();

        // Update seller metrics
        req.seller.metrics.totalBooksListed += 1;
        req.seller.metrics.activeListings += 1;
        await req.seller.save();

        res.status(201).json({ 
            ok: true, 
            message: 'Book created successfully',
            book: newBook
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/books/:bookId - Get single book details
// ─────────────────────────────────────────────────────────
router.get('/:bookId', async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(
            req.params.bookId,
            { $inc: { views: 1 } }, // Increment view count
            { new: true }
        ).populate('reviews.reviewsList');

        if (!book) {
            return res.status(404).json({ ok: false, message: 'Book not found' });
        }

        res.json({ ok: true, book });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/books/:bookId - Update book (seller only, must own book)
// ─────────────────────────────────────────────────────────
router.put('/:bookId', isSellerMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);

        if (!book) {
            return res.status(404).json({ ok: false, message: 'Book not found' });
        }

        // Check if seller owns this book
        if (book.seller.sellerId.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only edit your own books' });
        }

        // Update allowed fields
        const allowedUpdates = ['title', 'author', 'edition', 'price', 'stock', 'description', 'images', 'status'];
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                book[key] = req.body[key];
            }
        });

        // Recalculate discount if price updated
        if (req.body.price) {
            book.price.discount = Math.round(
                ((book.price.mrp - book.price.sellingPrice) / book.price.mrp) * 100
            );
        }

        book.updatedAt = new Date();
        await book.save();

        res.json({ ok: true, message: 'Book updated successfully', book });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/books/:bookId - Delete book (seller only)
// ─────────────────────────────────────────────────────────
router.delete('/:bookId', isSellerMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);

        if (!book) {
            return res.status(404).json({ ok: false, message: 'Book not found' });
        }

        if (book.seller.sellerId.toString() !== req.seller._id.toString()) {
            return res.status(403).json({ ok: false, message: 'You can only delete your own books' });
        }

        // Soft delete - change status
        book.status = 'inactive';
        await book.save();

        // Update seller metrics
        req.seller.metrics.activeListings = Math.max(0, req.seller.metrics.activeListings - 1);
        await req.seller.save();

        res.json({ ok: true, message: 'Book removed successfully' });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
