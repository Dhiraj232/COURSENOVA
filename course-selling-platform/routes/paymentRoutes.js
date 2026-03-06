const express = require('express');
const router = express.Router();
const { submitPayment, getPayments, approvePayment, rejectPayment } = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User submits payment
router.post('/submit', protect, upload.single('screenshot'), submitPayment);

// Admin routes
router.get('/', protect, admin, getPayments);
router.post('/:id/approve', protect, admin, approvePayment);
router.post('/:id/reject', protect, admin, rejectPayment);

module.exports = router;
