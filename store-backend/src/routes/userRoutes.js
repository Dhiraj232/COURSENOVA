const express = require('express');
const router = express.Router();
const { completeOnboarding } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Complete onboarding (save college, city, location coords)
router.put('/onboarding', protect, completeOnboarding);

// Get current user profile (Placeholder for now)
router.get('/profile', protect, (req, res) => res.json({ message: 'Profile details endpoint' }));

module.exports = router;
