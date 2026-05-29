const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const TestResult = require('../models/TestResult');
const PracticeQuestion = require('../models/PracticeQuestion');
const CourseProgress = require('../models/CourseProgress');
const UsedBook = require('../models/UsedBook');
const { requireAdmin } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Payment = require('../models/Payment');
const DailyChallenge = require('../models/DailyChallenge');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// ── 10. PDF TO QUESTIONS GENERATOR ──────────────────────────────────
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage() });

async function parsePdfBuffer(buffer) {
    const parser = new PDFParse({ verbosity: 0, data: buffer });
    const result = await parser.getText();
    return result.text || '';
}

router.post('/generate-questions-from-pdf', requireAdmin, upload.single('pdf'), catchAsync(async (req, res) => {
    console.log('[PDF Generator] Request received. File present:', !!req.file, 'Size:', req.file?.size);
    if (!req.file) throw new AppError('No PDF file uploaded', 400);

    let text = '';
    try {
        text = await parsePdfBuffer(req.file.buffer);
        console.log('[PDF Generator] Text extracted, length:', text.length);
        console.log('[PDF Generator] First 500 chars:', text.substring(0, 500));
    } catch (pdfErr) {
        console.error('[PDF Generator] PDF parse error:', pdfErr.message);
        return res.json({ ok: false, message: `Failed to read PDF: ${pdfErr.message}` });
    }

    const questions = [];

    // Strategy 1: Split by numbered lines like "1." or "1)"
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log('[PDF Generator] Total lines:', lines.length);

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Check if line starts with a question number
        const qMatch = line.match(/^(\d+)[\.\)]\s+(.+)/);
        if (qMatch) {
            const questionText = qMatch[2].trim();
            const options = [];
            let correctIndex = 0;
            let j = i + 1;

            // Collect option lines that follow
            while (j < lines.length && j < i + 15) {
                const optLine = lines[j];
                const optMatch = optLine.match(/^([A-Da-d])[\.\)\s]\s*(.+)/);
                const ansMatch = optLine.match(/(?:ans(?:wer)?|correct)[:\s]+([A-Da-d])/i);
                
                if (optMatch) {
                    options.push(optMatch[2].trim());
                } else if (ansMatch) {
                    correctIndex = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
                } else if (options.length > 0 && /^\d+[\.\)]/.test(optLine)) {
                    // Next question started
                    break;
                }
                j++;
            }

            if (options.length >= 2) {
                while (options.length < 4) options.push('—');
                const safeIdx = (correctIndex >= 0 && correctIndex < 4) ? correctIndex : 0;
                const correctAnswerStr = ['A', 'B', 'C', 'D'][safeIdx];
                questions.push({
                    question: questionText,
                    options: options.slice(0, 4),
                    correctAnswer: correctAnswerStr,
                    correctIndex: safeIdx,
                    category: 'Imported',
                    subject: 'General'
                });
                i = j;
                continue;
            }
        }
        i++;
    }

    console.log('[PDF Generator] Questions found:', questions.length);

    const lang = req.query.lang || 'en';

    if (questions.length === 0) {
        return res.json({ 
            ok: false, 
            message: `No MCQ questions detected. Make sure your PDF has format: "1. Question text" followed by "A) Option 1". Raw text preview: "${text.substring(0, 300)}"` 
        });
    }

    // Return field names based on language
    const formatted = questions.map(q => {
        if (lang === 'hi') {
            return {
                question_hi: q.question,
                options_hi: q.options
            };
        }
        return q; // English: return as-is (question, options, correctAnswer, category, subject)
    });

    res.json({ ok: true, questions: formatted, count: formatted.length });
}));

// Helper for audit trail
async function logAdminAction(req, action, targetId, targetModel, details = {}) {
    try {
        await AuditLog.create({
            adminId: req.userId,
            adminEmail: req.user?.email || 'admin@coursenova.in',
            action,
            targetId: String(targetId),
            targetModel,
            details,
            ip: req.ip
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
}

// ── 1. DASHBOARD STATS ──────────────────────────────────────────────────
router.get('/stats', requireAdmin, catchAsync(async (req, res) => {
    const [userCount, courseCount, testCount, certResults] = await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        TestResult.countDocuments(),
        CourseProgress.countDocuments({ certId: { $ne: null } })
    ]);

    res.json({
        ok: true,
        stats: {
            totalUsers: userCount,
            totalCourses: courseCount,
            totalTests: testCount,
            totalCertificates: certResults
        }
    });
}));

// Marketplace Stats
router.get('/marketplace-stats', requireAdmin, catchAsync(async (req, res) => {
    const [totalListings, totalSold, commissions] = await Promise.all([
        UsedBook.countDocuments(),
        UsedBook.countDocuments({ status: 'sold' }),
        UsedBook.aggregate([
            { $match: { status: 'sold' } },
            { $group: { _id: null, total: { $sum: "$commission" } } }
        ])
    ]);

    res.json({
        ok: true,
        stats: {
            totalListings,
            totalSold,
            totalCommissions: commissions.length > 0 ? commissions[0].total : 0
        }
    });
}));

// ── 2. COURSE MANAGEMENT ────────────────────────────────────────────────
router.get('/courses', requireAdmin, catchAsync(async (req, res) => {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ ok: true, courses });
}));

router.post('/courses', requireAdmin, catchAsync(async (req, res) => {
    const course = await Course.create(req.body);
    await logAdminAction(req, 'CREATE_COURSE', course._id, 'Course', { title: course.title });
    res.status(201).json({ ok: true, course });
}));

router.put('/courses/:id', requireAdmin, catchAsync(async (req, res) => {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) throw new AppError('Course not found', 404);
    await logAdminAction(req, 'UPDATE_COURSE', course._id, 'Course', { title: course.title });
    res.json({ ok: true, course });
}));

router.delete('/courses/:id', requireAdmin, catchAsync(async (req, res) => {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) throw new AppError('Course not found', 404);
    await logAdminAction(req, 'DELETE_COURSE', course._id, 'Course', { title: course.title });
    res.json({ ok: true, message: 'Course deleted' });
}));

// ── 3. QUESTION MANAGEMENT ─────────────────────────────────────────────
router.get('/questions', requireAdmin, catchAsync(async (req, res) => {
    const { category, subject } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (subject) filter.subject = subject;

    const questions = await PracticeQuestion.find(filter).limit(100);
    res.json({ ok: true, questions });
}));

router.post('/questions', requireAdmin, catchAsync(async (req, res) => {
    if (Array.isArray(req.body)) {
        const questions = await PracticeQuestion.insertMany(req.body);
        return res.status(201).json({ ok: true, count: questions.length, questions });
    }
    const question = await PracticeQuestion.create(req.body);
    res.status(201).json({ ok: true, question });
}));

// ── 3b. ADD HINDI to existing questions (bulk) ──────────────────────────────
// Payload: [{ _id, question_hi, options_hi }]
router.post('/questions/add-hindi', requireAdmin, catchAsync(async (req, res) => {
    const pairs = req.body;
    if (!Array.isArray(pairs) || pairs.length === 0) {
        throw new AppError('Payload must be an array of {_id, question_hi, options_hi}', 400);
    }

    let updated = 0;
    const errors = [];

    await Promise.all(pairs.map(async ({ _id, question_hi, options_hi }) => {
        if (!_id) return;
        try {
            await PracticeQuestion.findByIdAndUpdate(_id, {
                $set: { question_hi, options_hi }
            });
            updated++;
        } catch (e) {
            errors.push(`${_id}: ${e.message}`);
        }
    }));

    res.json({ ok: true, updated, errors });
}));

// ── 4. USER MANAGEMENT ───────────────────────────────────────────────
router.get('/users', requireAdmin, catchAsync(async (req, res) => {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ ok: true, users });
}));

// Update User Role / Block User
router.put('/users/:id/role', requireAdmin, catchAsync(async (req, res) => {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    // Prevent blocking the master admin
    if (user.email === 'coursenova.in@gmail.com') {
        throw new AppError('Cannot modify master admin', 403);
    }

    user.role = role;
    await user.save();
    await logAdminAction(req, 'UPDATE_USER_ROLE', user._id, 'User', { newRole: role, email: user.email });
    res.json({ ok: true, user });
}));

router.delete('/users/:id', requireAdmin, catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);

    if (user.email === 'coursenova.in@gmail.com') {
        throw new AppError('Cannot delete master admin', 403);
    }

    await User.findByIdAndDelete(req.params.id);
    await logAdminAction(req, 'DELETE_USER', user._id, 'User', { email: user.email });
    res.json({ ok: true, message: 'User deleted' });
}));

// ── 5. CERTIFICATE MONITORING ─────────────────────────────────────────
router.get('/certificates', requireAdmin, catchAsync(async (req, res) => {
    const certs = await CourseProgress.find({ certId: { $ne: null } })
        .populate('userId', 'name email profileImage')
        .sort({ updatedAt: -1 });
    res.json({ ok: true, certs });
}));

router.get('/certificates/verify/:certId', catchAsync(async (req, res) => {
    const cert = await CourseProgress.findOne({ certId: req.params.certId })
        .populate('userId', 'name email');
    if (!cert) throw new AppError('Certificate ID invalid or not found', 404);
    res.json({ ok: true, cert });
}));

// ── 6. PAYMENT MANAGEMENT ──────────────────────────────────────────
router.get('/payments', requireAdmin, catchAsync(async (req, res) => {
    const payments = await Payment.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });
    res.json({ ok: true, payments });
}));

// ── 7. DAILY CHALLENGE RESULTS ──────────────────────────────────────
router.get('/daily-challenge/results', requireAdmin, catchAsync(async (req, res) => {
    const { date, examType } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (examType) filter.examType = examType;

    const results = await TestResult.find(filter)
        .populate('userId', 'name email')
        .sort({ score: -1, timeTaken: 1 });
        
    res.json({ ok: true, results });
}));

const MockTestPack = require('../models/MockTestPack');

// ── 8. MOCK TEST MANAGEMENT ──────────────────────────────────────────
router.get('/mock-tests', requireAdmin, catchAsync(async (req, res) => {
    const packs = await MockTestPack.find().sort({ createdAt: -1 });
    res.json({ ok: true, packs });
}));

router.post('/mock-tests', requireAdmin, catchAsync(async (req, res) => {
    const pack = await MockTestPack.create(req.body);
    await logAdminAction(req, 'CREATE_MOCK_TEST', pack._id, 'MockTestPack', { title: pack.title });
    res.status(201).json({ ok: true, pack });
}));

router.put('/mock-tests/:id', requireAdmin, catchAsync(async (req, res) => {
    const pack = await MockTestPack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pack) throw new AppError('Mock test pack not found', 404);
    await logAdminAction(req, 'UPDATE_MOCK_TEST', pack._id, 'MockTestPack', { title: pack.title });
    res.json({ ok: true, pack });
}));

router.delete('/mock-tests/:id', requireAdmin, catchAsync(async (req, res) => {
    const pack = await MockTestPack.findByIdAndDelete(req.params.id);
    if (!pack) throw new AppError('Mock test pack not found', 404);
    await logAdminAction(req, 'DELETE_MOCK_TEST', pack._id, 'MockTestPack', { title: pack.title });
    res.json({ ok: true, message: 'Pack deleted' });
}));

// Questions detail for a specific pack
router.get('/mock-tests/:id/questions', requireAdmin, catchAsync(async (req, res) => {
    const pack = await MockTestPack.findById(req.params.id).populate('tests.questions');
    if (!pack) throw new AppError('Pack not found', 404);
    res.json({ ok: true, tests: pack.tests });
}));

// ── 9. MARKETPLACE MANAGEMENT ─────────────────────────────────────────
router.get('/marketplace/all-books', requireAdmin, catchAsync(async (req, res) => {
    // Explicitly use collection name 'usedbooks' to avoid any Mongoose ambiguity
    const books = await mongoose.model('UsedBook').find().sort({ createdAt: -1 });
    res.json({ ok: true, books });
}));

router.delete('/marketplace/books/:id', requireAdmin, catchAsync(async (req, res) => {
    const UsedBook = mongoose.model('UsedBook');
    const book = await UsedBook.findById(req.params.id);
    if (!book) throw new AppError('Book not found', 404);

    if (book.image) {
        const path = require('path');
        const fs = require('fs');
        const imgPath = path.join(__dirname, '..', 'uploads', 'books', book.image);
        if (fs.existsSync(imgPath)) {
            try {
                fs.unlinkSync(imgPath);
            } catch (err) {
                console.error("Failed to delete book image:", err);
            }
        }
    }

    await UsedBook.findByIdAndDelete(req.params.id);

    // Audit Log
    try {
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            adminId: req.user.userId || req.user.id,
            adminEmail: req.user.email || 'admin@coursenova.in',
            action: 'DELETE_USED_BOOK',
            targetModel: 'UsedBook',
            targetId: book._id.toString(),
            details: `Deleted book "${book.title}" by seller ${book.sellerName}`
        });
    } catch (e) {
        console.warn("Audit log creation failed:", e.message);
    }

    res.json({ ok: true, message: 'Book listing deleted successfully' });
}));

// ── 10. AUDIT LOGS ──────────────────────────────────────────────────
router.get('/audit-logs', requireAdmin, catchAsync(async (req, res) => {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ ok: true, logs });
}));

// ── 11. SLIDESHOW BANNER MANAGEMENT ─────────────────────────────────
const path = require('path');
const Slide = require('../models/Slide');

// Multer storage setup for slide images
const slideStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'slides');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `slide_${Date.now()}${ext}`);
    }
});

const uploadSlide = multer({
    storage: slideStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'), false);
    }
});

// Ensure slide uploads directory exists
const fs = require('fs');
const slideUploadDir = path.join(__dirname, '..', 'uploads', 'slides');
if (!fs.existsSync(slideUploadDir)) {
    fs.mkdirSync(slideUploadDir, { recursive: true });
}

// 11a. Public endpoint to retrieve active slides
router.get('/slides/active', catchAsync(async (req, res) => {
    let slides = await Slide.find({ isActive: true }).sort({ order: 1 });
    
    // Self-healing / Auto-seeding of 6 default slideshow cards if DB is empty
    if (slides.length === 0) {
        console.log('[Slides Seeder] No slides found in DB. Auto-seeding 6 default slides...');
        const defaultSlides = [
            {
                title: 'Celebrating Years of COURSENOVA',
                subtitle: 'OFFER IS LIVE! Get Up To 40% OFF on premium exam batches! Limited Time Only.',
                image: 'default_slide_1.png',
                link: '/premium-courses.html',
                order: 1,
                isActive: true
            },
            {
                title: 'Detailed Syllabus-Based Notes',
                subtitle: 'Designed specifically for Indian colleges. Access physics, math, and coding theory.',
                image: 'default_slide_2.png',
                link: '/certificates.html',
                order: 2,
                isActive: true
            },
            {
                title: 'Exam-focused Practice MCQs & Tests',
                subtitle: 'Test your academic prep with subject-level practice questions. Boost your GPA.',
                image: 'default_slide_3.png',
                link: '/practice.html',
                order: 3,
                isActive: true
            },
            {
                title: 'Earn Verified College Certificates',
                subtitle: 'Complete final course assignments to download verified certificates shareable on LinkedIn.',
                image: 'default_slide_4.png',
                link: '/certificates.html',
                order: 4,
                isActive: true
            },
            {
                title: 'Free Daily Practice Challenges',
                subtitle: 'Compete in college leaderboards, complete the daily challenge, and earn student points.',
                image: 'default_slide_5.png',
                link: '/daily-challenge.html',
                order: 5,
                isActive: true
            },
            {
                title: 'Used Books Marketplace Hub',
                subtitle: 'Sell college course books or buy syllabus textbooks locally in your university campus.',
                image: 'default_slide_6.png',
                link: '/store.html',
                order: 6,
                isActive: true
            }
        ];
        
        slides = await Slide.insertMany(defaultSlides);
    }
    
    res.json({ ok: true, slides });
}));

// 11b. Admin-only: Retrieve all slides for slide manager
router.get('/slides', requireAdmin, catchAsync(async (req, res) => {
    const slides = await Slide.find().sort({ order: 1, createdAt: -1 });
    res.json({ ok: true, slides });
}));

// 11c. Admin-only: Create a new slide banner (supports file upload)
router.post('/slides', requireAdmin, uploadSlide.single('image'), catchAsync(async (req, res) => {
    const { title, subtitle, link, order, isActive } = req.body;
    
    if (!title) {
        throw new AppError('Slide title is required', 400);
    }
    if (!req.file) {
        throw new AppError('Slide banner image upload is required', 400);
    }

    const newSlide = await Slide.create({
        title,
        subtitle: subtitle || '',
        image: req.file.filename,
        link: link || '',
        order: Number(order) || 0,
        isActive: isActive === 'true' || isActive === true
    });

    await logAdminAction(req, 'CREATE_SLIDE', newSlide._id, 'Slide', { title: newSlide.title });
    res.status(201).json({ ok: true, slide: newSlide });
}));

// 11d. Admin-only: Edit an existing slide banner (supports replacing file upload)
router.put('/slides/:id', requireAdmin, uploadSlide.single('image'), catchAsync(async (req, res) => {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
        throw new AppError('Slide not found', 404);
    }

    const { title, subtitle, link, order, isActive } = req.body;
    
    if (title !== undefined) slide.title = title;
    if (subtitle !== undefined) slide.subtitle = subtitle;
    if (link !== undefined) slide.link = link;
    if (order !== undefined) slide.order = Number(order) || 0;
    if (isActive !== undefined) slide.isActive = isActive === 'true' || isActive === true;

    // If a new image file is uploaded, update and optionally delete the old image file
    if (req.file) {
        const oldImageName = slide.image;
        slide.image = req.file.filename;

        // Try to remove old image if it wasn't a seeded default slide image
        if (oldImageName && !oldImageName.startsWith('default_slide')) {
            const oldImagePath = path.join(__dirname, '..', 'uploads', 'slides', oldImageName);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (e) {
                    console.error('[Admin API] Error removing old slide image file:', e);
                }
            }
        }
    }

    await slide.save();
    await logAdminAction(req, 'UPDATE_SLIDE', slide._id, 'Slide', { title: slide.title });
    res.json({ ok: true, slide });
}));

// 11e. Admin-only: Delete a slide banner and its image file
router.delete('/slides/:id', requireAdmin, catchAsync(async (req, res) => {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
        throw new AppError('Slide not found', 404);
    }

    const imageName = slide.image;
    await Slide.findByIdAndDelete(req.params.id);

    // Delete image file from server if it wasn't a seeded default slide
    if (imageName && !imageName.startsWith('default_slide')) {
        const imagePath = path.join(__dirname, '..', 'uploads', 'slides', imageName);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (e) {
                console.error('[Admin API] Error removing slide image file:', e);
            }
        }
    }

    await logAdminAction(req, 'DELETE_SLIDE', slide._id, 'Slide', { title: slide.title });
    res.json({ ok: true, message: 'Slide deleted successfully' });
}));

// ── 12. BROADCAST ANNOUNCEMENTS / NOTIFICATIONS ─────────────────────
// Create announcement (Admin only)
router.post('/notifications', requireAdmin, catchAsync(async (req, res) => {
    const { message } = req.body;
    if (!message) throw new AppError('Message is required', 400);

    const announcement = await Notification.create({
        recipientId: null, // null for broadcast
        senderId: req.userId,
        senderName: 'Admin',
        type: 'announcement',
        message
    });

    await logAdminAction(req, 'CREATE_ANNOUNCEMENT', announcement._id, 'Notification', { message: message.substring(0, 50) });
    res.status(201).json({ ok: true, announcement });
}));

// List announcements (Admin only)
router.get('/notifications', requireAdmin, catchAsync(async (req, res) => {
    const announcements = await Notification.find({ type: 'announcement' }).sort({ createdAt: -1 });
    res.json({ ok: true, announcements });
}));

// Delete announcement (Admin only)
router.delete('/notifications/:id', requireAdmin, catchAsync(async (req, res) => {
    const announcement = await Notification.findByIdAndDelete(req.params.id);
    if (!announcement) throw new AppError('Announcement not found', 404);

    await logAdminAction(req, 'DELETE_ANNOUNCEMENT', req.params.id, 'Notification');
    res.json({ ok: true, message: 'Announcement deleted successfully' });
}));

module.exports = router;
