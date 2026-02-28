const express = require('express');
const router = express.Router();
const { googleAuth } = require('../controllers/authController');

// @route   POST /api/auth/google
// @desc    Auth with Google
// @access  Public
router.post('/google', googleAuth);

module.exports = router;
