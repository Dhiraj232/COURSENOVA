/**
 * RENVOX Store API Routes
 * Private Book Exchange — College & Children groups
 * All routes prefixed /api/store
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const StoreUser = require('../models/User');
const Book = require('../models/Book');
const Seller = require('../models/Seller');
const { requireStoreAuth, requireProfile } = require('../middleware/storeAuth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1055845988581-ri62t8onk3drda4qc3q5pi0gi3bsmksa.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────
// POST /api/store/google-auth
// Verify Google credential → create/find store user → return JWT
// ─────────────────────────────────────────────────────────────
router.post('/google-auth', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ ok: false, message: 'No credential provided' });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) return res.status(400).json({ ok: false, message: 'Invalid Google token' });

        const { sub: googleId, name, email, picture } = payload;

        let user = await StoreUser.findOne({ googleId });
        if (!user) {
            user = await StoreUser.create({ googleId, name, email, picture: picture || '' });
        } else {
            // Refresh name/picture in case they changed
            user.name = name;
            user.picture = picture || user.picture;
            await user.save();
        }

        const token = jwt.sign({ storeUserId: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            ok: true,
            token,
            user: sanitizeUser(user)
        });
    } catch (err) {
        console.error('Store Google Auth Error:', err);
        res.status(500).json({ ok: false, message: 'Authentication failed' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/store/me
// Return current store user profile
// ─────────────────────────────────────────────────────────────
router.get('/me', requireStoreAuth, async (req, res) => {
    res.json({ ok: true, user: sanitizeUser(req.storeUser) });
});

// ─────────────────────────────────────────────────────────────
// POST /api/store/profile
// Save user profile after first login (role + college/child info)
// ─────────────────────────────────────────────────────────────
router.post('/profile', requireStoreAuth, async (req, res) => {
    try {
        const { role, collegeName, department, year, childClass } = req.body;
        const user = req.storeUser;

        if (!role || !['college', 'child'].includes(role)) {
            return res.status(400).json({ ok: false, message: 'Invalid role. Must be "college" or "child".' });
        }

        if (role === 'college') {
            if (!collegeName || !collegeName.trim()) return res.status(400).json({ ok: false, message: 'College name is required.' });
            if (!department || !department.trim()) return res.status(400).json({ ok: false, message: 'Department is required.' });
            if (!year || !year.trim()) return res.status(400).json({ ok: false, message: 'Year is required.' });
            user.collegeName = collegeName.trim();
            user.department = department.trim();
            user.year = year.trim();
            user.childClass = '';
        } else {
            if (!childClass || !childClass.trim()) return res.status(400).json({ ok: false, message: 'Class is required.' });
            user.childClass = childClass.trim();
            user.collegeName = '';
            user.department = '';
            user.year = '';
        }

        user.role = role;
        user.profileComplete = true;
        await user.save();

        res.json({ ok: true, message: 'Profile saved!', user: sanitizeUser(user) });
    } catch (err) {
        console.error('Store Profile Error:', err);
        res.status(500).json({ ok: false, message: 'Could not save profile' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/store/books
// Fetch books — filtered strictly by user role & college
// ─────────────────────────────────────────────────────────────
router.get('/books', requireStoreAuth, requireProfile, async (req, res) => {
    try {
        const user = req.storeUser;
        const { condition, maxPrice, status } = req.query;

        // Build base query based on role
        const query = { visibilityGroup: user.role };
        if (user.role === 'college') query.collegeName = user.collegeName; // strictly same college

        // Optional filters
        if (condition) query.condition = condition;
        if (status) query.status = status;
        else query.status = { $in: ['available', 'sold', 'given'] }; // all statuses by default
        if (maxPrice) query.price = { $lte: Number(maxPrice) };

        const books = await Book.find(query).sort({ createdAt: -1 }).lean();
        res.json({ ok: true, books });
    } catch (err) {
        console.error('Fetch Books Error:', err);
        res.status(500).json({ ok: false, message: 'Could not fetch books' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/store/books
// List a new book for sale
// ─────────────────────────────────────────────────────────────
router.post('/books', requireStoreAuth, requireProfile, async (req, res) => {
    try {
        const user = req.storeUser;
        const { title, author, subject, category, condition, isFree, price, contact, img } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ ok: false, message: 'Book title is required.' });

        // Validate image size (base64 ~1.37x actual; 5MB → ~7MB base64)
        if (img && img.length > 7 * 1024 * 1024) {
            return res.status(400).json({ ok: false, message: 'Image too large. Please use a photo under 5 MB.' });
        }

        // ── Auto-create or find a Seller record for this user ──────────────
        let seller = await Seller.findOne({ userId: user._id });
        if (!seller) {
            seller = await Seller.create({
                userId: user._id,
                sellerType: user.role === 'college' ? 'Individual' : 'Individual',
                businessInfo: {
                    businessName: user.name || 'RENVOX Store Seller'
                },
                address: {
                    city: 'India',
                    state: '',
                    country: 'India'
                },
                contactInfo: {
                    phoneNumber: contact || '0000000000',
                    email: user.email || ''
                },
                collegeInstitute: user.collegeName || '',
                status: 'active'   // auto-active for store users
            });
        } else if (seller.status !== 'active') {
            // Re-activate if previously inactive
            seller.status = 'active';
            await seller.save();
        }

        // ── Calculate price fields ─────────────────────────────────────────
        const sellingPrice = isFree ? 0 : (Number(price) || 0);
        const mrp = sellingPrice;   // for peer-to-peer store, MRP = selling price
        const discount = 0;

        // ── Build images array ────────────────────────────────────────────
        const images = img ? [{ imageType: 'front_cover', imageUrl: img }] : [];

        const book = await Book.create({
            title: title.trim(),
            author: (author || user.name || 'Unknown').trim(),
            category: category || subject || 'General',
            description: (subject || '').trim(),
            condition: condition || 'Used',
            price: {
                mrp,
                sellingPrice,
                discount
            },
            images,
            stock: {
                totalQuantity: 1,
                availableQuantity: 1,
                reorderLevel: 1
            },
            seller: {
                sellerId: seller._id,
                sellerType: seller.sellerType,
                sellerName: seller.businessInfo.businessName,
                contactNumber: contact || seller.contactInfo.phoneNumber,
                email: user.email || seller.contactInfo.email,
                address: seller.address,
                collegeInstitute: user.collegeName || ''
            },
            tags: [subject, category].filter(Boolean),
            status: 'active'
        });

        res.json({ ok: true, message: 'Book listed!', book });
    } catch (err) {
        console.error('Add Book Error:', err.message, err.stack);
        res.status(500).json({ ok: false, message: err.message || 'Could not list book' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/store/books/:id
// Update a book listing (owner only)
// ─────────────────────────────────────────────────────────────
router.put('/books/:id', requireStoreAuth, requireProfile, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.ownerId.toString() !== req.storeUser._id.toString()) {
            return res.status(403).json({ ok: false, message: 'Not your listing' });
        }

        const { title, subject, condition, isFree, price, contact, img } = req.body;
        if (title) book.title = title.trim();
        if (subject !== undefined) book.subject = subject.trim();
        if (condition) book.condition = condition;
        if (isFree !== undefined) { book.isFree = !!isFree; book.price = isFree ? 0 : (Number(price) || book.price); }
        else if (price !== undefined) book.price = Number(price);
        if (contact !== undefined) book.contact = contact.trim();
        if (img) book.img = img;

        await book.save();
        res.json({ ok: true, message: 'Book updated', book });
    } catch (err) {
        console.error('Update Book Error:', err);
        res.status(500).json({ ok: false, message: 'Could not update book' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/store/books/:id
// Delete a book listing (owner only)
// ─────────────────────────────────────────────────────────────
router.delete('/books/:id', requireStoreAuth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.ownerId.toString() !== req.storeUser._id.toString()) {
            return res.status(403).json({ ok: false, message: 'Not your listing' });
        }
        await book.deleteOne();
        res.json({ ok: true, message: 'Listing deleted' });
    } catch (err) {
        console.error('Delete Book Error:', err);
        res.status(500).json({ ok: false, message: 'Could not delete book' });
    }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/store/books/:id/status
// Mark book as sold / given / available (owner only)
// ─────────────────────────────────────────────────────────────
router.patch('/books/:id/status', requireStoreAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['available', 'sold', 'given'].includes(status)) {
            return res.status(400).json({ ok: false, message: 'Invalid status' });
        }
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ ok: false, message: 'Book not found' });
        if (book.ownerId.toString() !== req.storeUser._id.toString()) {
            return res.status(403).json({ ok: false, message: 'Not your listing' });
        }
        book.status = status;
        await book.save();
        res.json({ ok: true, message: `Marked as ${status}`, book });
    } catch (err) {
        console.error('Status Update Error:', err);
        res.status(500).json({ ok: false, message: 'Could not update status' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/store/my-books
// Get only the current user's own listings
// ─────────────────────────────────────────────────────────────
router.get('/my-books', requireStoreAuth, async (req, res) => {
    try {
        const books = await Book.find({ ownerId: req.storeUser._id }).sort({ createdAt: -1 }).lean();
        res.json({ ok: true, books });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Could not fetch your books' });
    }
});

// ─── Helper ───────────────────────────────────────────────────
function sanitizeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        profileComplete: user.profileComplete,
        role: user.role,
        collegeName: user.collegeName,
        department: user.department,
        year: user.year,
        childClass: user.childClass
    };
}

module.exports = router;
