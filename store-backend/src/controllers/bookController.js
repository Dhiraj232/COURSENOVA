const Book = require('../models/Book');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
exports.getBooks = async (req, res) => {
    try {
        const { subject, collegeName, minPrice, maxPrice, condition } = req.query;
        let query = {};

        if (subject) query.subject = new RegExp(subject, 'i');
        if (collegeName) query.collegeName = new RegExp(collegeName, 'i');
        if (condition) query.condition = condition;

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Only show available books
        query.status = 'available';

        const books = await Book.find(query)
            .populate('seller', 'name profilePicture collegeName')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: books.length,
            data: books
        });
    } catch (error) {
        console.error('Get Books Error:', error);
        res.status(500).json({ message: 'Server Error fetching books' });
    }
};

// @desc    Create new book listing
// @route   POST /api/books
// @access  Private
exports.createBook = async (req, res) => {
    try {
        // Add seller info from the auth middleware
        req.body.seller = req.user.id;

        // Auto-fill location/college from seller's profile
        req.body.collegeName = req.user.collegeName;
        req.body.location = req.user.location;

        const book = await Book.create(req.body);

        res.status(201).json({
            success: true,
            data: book
        });
    } catch (error) {
        console.error('Create Book Error:', error);
        res.status(500).json({ message: 'Server Error creating listing' });
    }
};
