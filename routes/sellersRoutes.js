/**
 * SELLERS API ROUTES
 * Seller registration, profile, and analytics
 */

const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const Book = require('../models/Book');

const { requireAuth } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// POST /api/sellers - Register as seller
// ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            sellerType,
            businessName,
            phoneNumber,
            email,
            address,
            collegeInstitute,
            documents = []
        } = req.body;

        // Check if already seller
        const existingSeller = await Seller.findOne({ userId: req.user.id });
        if (existingSeller) {
            return res.status(400).json({ ok: false, message: 'You are already registered as a seller' });
        }

        // Validation
        if (!sellerType || !businessName || !phoneNumber || !address || !address.city) {
            return res.status(400).json({ 
                ok: false, 
                message: 'Missing required fields' 
            });
        }

        const seller = new Seller({
            userId: req.user.id,
            sellerType,
            businessInfo: {
                businessName,
                panNumber: '',
                gstNumber: ''
            },
            address,
            contactInfo: {
                phoneNumber,
                email: email || req.user.email,
                whatsapp: phoneNumber
            },
            collegeInstitute: collegeInstitute || '',
            verification: {
                verificationDocs: documents,
                verificationStatus: 'pending'
            },
            status: 'inactive' // Needs verification
        });

        await seller.save();

        res.status(201).json({
            ok: true,
            message: 'Seller registration submitted. Verify documents to activate.',
            seller
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/sellers/:sellerId - Get seller profile
// ─────────────────────────────────────────────────────────
router.get('/:sellerId', async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.sellerId)
            .select('-bankDetails -panNumber -gstNumber'); // Hide sensitive info

        if (!seller) {
            return res.status(404).json({ ok: false, message: 'Seller not found' });
        }

        res.json({ ok: true, seller });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// PUT /api/sellers/:sellerId - Update seller profile (own only)
// ─────────────────────────────────────────────────────────
router.put('/:sellerId', requireAuth, async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.sellerId);

        if (!seller) {
            return res.status(404).json({ ok: false, message: 'Seller not found' });
        }

        if (seller.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        // Allowed updates
        const allowedUpdates = ['contactInfo', 'address', 'supportTimings'];
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                seller[key] = { ...seller[key], ...req.body[key] };
            }
        });

        await seller.save();

        res.json({ ok: true, message: 'Profile updated', seller });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/sellers/:sellerId/books - Get seller's books
// ─────────────────────────────────────────────────────────
router.get('/:sellerId/books', async (req, res) => {
    try {
        const books = await Book.find({
            'seller.sellerId': req.params.sellerId,
            status: 'active'
        }).select('title price images reviews');

        res.json({ ok: true, books });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// POST /api/sellers/verify - Upload verification documents
// ─────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
    try {
        const { documents } = req.body;

        const seller = await Seller.findOne({ userId: req.user.id });

        if (!seller) {
            return res.status(404).json({ ok: false, message: 'Seller not found' });
        }

        seller.verification.verificationDocs = documents;
        seller.verification.verificationStatus = 'pending';

        await seller.save();

        res.json({ ok: true, message: 'Documents submitted for verification', seller });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/sellers/metrics - Get seller analytics (own only)
// ─────────────────────────────────────────────────────────
router.get('/:sellerId/metrics', requireAuth, async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.sellerId);

        if (!seller || seller.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ ok: false, message: 'Unauthorized' });
        }

        // Get books by this seller
        const books = await Book.find({ 'seller.sellerId': seller._id });

        const metrics = {
            totalBooksListed: books.length,
            activeListings: books.filter(b => b.status === 'active').length,
            totalViews: books.reduce((sum, b) => sum + (b.views || 0), 0),
            averageRating: seller.metrics.averageRating,
            totalSales: seller.metrics.totalSales,
            responseTime: seller.metrics.responseTime || '<2 hours'
        };

        res.json({ ok: true, metrics });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
