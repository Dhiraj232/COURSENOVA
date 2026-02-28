const express = require('express');
const router = express.Router();
const { getBooks, createBook } = require('../controllers/bookController');
const { protect } = require('../middlewares/authMiddleware');

// Publicly browse books based on filters
router.get('/', getBooks);

// Create a new listing (Auth required)
router.post('/', protect, createBook);

// View single book details
router.get('/:id', (req, res) => res.json({ message: 'Get single book' }));

// Edit listing (Auth & Seller only)
router.put('/:id', protect, (req, res) => res.json({ message: 'Edit book listing' }));

// Delete listing (Auth & Seller only)
router.delete('/:id', protect, (req, res) => res.json({ message: 'Delete book listing' }));

module.exports = router;
