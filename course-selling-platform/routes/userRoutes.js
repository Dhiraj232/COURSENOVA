const express = require('express');
const router = express.Router();
const { getMyCourses, generateCertificate, getAllUsers } = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

router.get('/my-courses', protect, getMyCourses);
router.get('/certificate/:courseId', protect, generateCertificate);
router.get('/', protect, admin, getAllUsers);

module.exports = router;
