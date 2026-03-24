const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');

const Course        = require('../models/Course');
const Enrollment    = require('../models/Enrollment');
const Payment       = require('../models/Payment');
const CourseProgress= require('../models/CourseProgress');
const User          = require('../models/User');
const Activity      = require('../models/Activity');
const Transaction   = require('../models/Transaction');
const ExamAttempt   = require('../models/ExamAttempt');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const MAX_EXAM_ATTEMPTS = 3;

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_TYYvG5LdO0V12j',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'tK0lWjAOr3mR0K9uI3uSqkZ1'
});

// ─── Helper: check if a user is enrolled in a course ─────────────────────────
async function isEnrolled(userId, courseId) {
    if (!userId) return false;
    const enrollment = await Enrollment.findOne({ userId: String(userId), courseId: String(courseId) });
    if (enrollment) return true;
    // Legacy: check User.enrolledCourses string array
    const user = await User.findById(userId);
    return !!(user && user.enrolledCourses &&
        (user.enrolledCourses.includes(courseId) ||
         user.enrolledCourses.some(c =>
            c.toLowerCase() === courseId.toLowerCase()
         )
        )
    );
}

// ─── GET /api/premium/courses ─────────────────────────────────────────────────
// Public — lists all active premium courses. Strips quiz answers.
router.get('/courses', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({ isPremium: true, isActive: true })
            .select('-quizQuestions.correctIndex -__v')
            .lean();

        // If user is logged in, annotate each course with enrollment status
        const userId = req.userId || null;
        const annotated = await Promise.all(courses.map(async c => {
            const enrolled = userId ? await isEnrolled(userId, String(c._id)) : false;
            let progress = null;
            if (enrolled) {
                const p = await CourseProgress.findOne({ userId: String(userId), courseId: String(c._id) }).lean();
                if (p) progress = { progressPercent: p.progressPercent, isCompleted: p.isCompleted };
            }
            return { ...c, enrolled, progress };
        }));

        res.json({ ok: true, courses: annotated });
    } catch (err) {
        console.error('GET /premium/courses error:', err);
        res.status(500).json({ ok: false, message: 'Failed to fetch premium courses' });
    }
});

// ─── GET /api/premium/course/:id ─────────────────────────────────────────────
// Public metadata — returns course info. Content (quizQuestions) only for enrolled.
router.get('/course/:id', optionalAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).lean();
        if (!course || !course.isPremium) return res.status(404).json({ ok: false, message: 'Premium course not found' });

        const userId = req.userId || null;
        const enrolled = await isEnrolled(userId, String(course._id));

        // Strip answer keys for non-enrolled users
        if (!enrolled && course.quizQuestions) {
            course.quizQuestions = course.quizQuestions.map(q => ({
                question: q.question,
                options:  q.options
                // correctIndex intentionally omitted
            }));
        }

        // If not enrolled, also hide the actual video/pdf URLs
        if (!enrolled) {
            course.lessons = (course.lessons || []).map(l => ({
                lessonId: l.lessonId,
                title:    l.title,
                order:    l.order
                // videoUrl and pdfUrl hidden
            }));
        }

        let progress = null;
        let examAttemptsLeft = MAX_EXAM_ATTEMPTS;
        if (enrolled && userId) {
            const p = await CourseProgress.findOne({ userId: String(userId), courseId: String(course._id) }).lean();
            if (p) progress = p;
            const ea = await ExamAttempt.findOne({ userId: String(userId), courseId: String(course._id) }).lean();
            if (ea) examAttemptsLeft = Math.max(0, MAX_EXAM_ATTEMPTS - ea.attempts);
        }

        res.json({ ok: true, course, enrolled, progress, examAttemptsLeft });
    } catch (err) {
        console.error('GET /premium/course/:id error:', err);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// ─── POST /api/premium/create-order ──────────────────────────────────────────
// Creates a Razorpay order. Requires auth.
router.post('/create-order', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

        const course = await Course.findById(courseId);
        if (!course || !course.isPremium) return res.status(404).json({ ok: false, message: 'Premium course not found' });

        // Check already enrolled
        const alreadyEnrolled = await isEnrolled(req.userId, String(course._id));
        if (alreadyEnrolled) return res.status(400).json({ ok: false, message: 'Already enrolled in this course' });

        const options = {
            amount:   course.price * 100,   // paise
            currency: 'INR',
            receipt:  `prem_${req.userId}_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.json({
            ok:       true,
            orderId:  order.id,
            amount:   order.amount,
            currency: order.currency,
            courseId: String(course._id),
            courseName: course.title,
            key:      process.env.RAZORPAY_KEY_ID || 'rzp_test_TYYvG5LdO0V12j'
        });
    } catch (err) {
        console.error('Create-order error:', err);
        res.status(500).json({ ok: false, message: 'Failed to create Razorpay order' });
    }
});

// ─── POST /api/premium/verify-payment ────────────────────────────────────────
// Verifies Razorpay payment signature, enrolls user, creates Payment record.
router.post('/verify-payment', requireAuth, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
        return res.status(400).json({ ok: false, message: 'Missing payment fields' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'tK0lWjAOr3mR0K9uI3uSqkZ1';
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ ok: false, message: 'Invalid payment signature. Possible fraud attempt.' });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });

        const userId = String(req.userId);

        // 1. Enrollment record (upsert)
        await Enrollment.findOneAndUpdate(
            { userId, courseId: String(course._id) },
            {
                userId,
                courseId:   String(course._id),
                courseName: course.title,
                paymentId:  razorpay_payment_id,
                amount:     course.price,
                purchaseDate: new Date()
            },
            { upsert: true, new: true }
        );

        // 2. User.enrolledCourses quick lookup
        const user = await User.findById(userId);
        if (user && !user.enrolledCourses.includes(String(course._id))) {
            user.enrolledCourses.push(String(course._id));
            await user.save();
        }

        // 3. Payment record
        await Payment.create({
            userId,
            courseId:            String(course._id),
            courseName:          course.title,
            amount:              course.price,
            razorpayOrderId:     razorpay_order_id,
            razorpayPaymentId:   razorpay_payment_id,
            razorpaySignature:   razorpay_signature,
            paymentMethod:       'razorpay',
            status:              'approved'
        });

        // 4. Transaction record
        try {
            await Transaction.create({
                userId,
                courseId:   String(course._id),
                courseName: course.title,
                amount:     course.price,
                paymentId:  razorpay_payment_id,
                orderId:    razorpay_order_id,
                status:     'success'
            });
        } catch (e) { console.warn('Transaction log error:', e.message); }

        // 5. Activity log
        try {
            await Activity.create({
                userId,
                type:       'course_enrolled',
                title:      `Enrolled: ${course.title}`,
                description:`Purchased premium course "${course.title}" via Razorpay.`,
                courseId:   String(course._id),
                courseName: course.title
            });
        } catch (e) { console.warn('Activity log error:', e.message); }

        res.json({ ok: true, message: 'Payment verified. You are now enrolled!', courseName: course.title });
    } catch (err) {
        console.error('Verify-payment error:', err);
        res.status(500).json({ ok: false, message: 'Payment verified but enrollment failed. Contact support.' });
    }
});

// ─── GET /api/premium/access/:courseId ───────────────────────────────────────
// Returns enrollment status + progress + exam attempts left.
router.get('/access/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = String(req.userId);
        const enrolled = await isEnrolled(userId, courseId);

        let progress = null;
        let examAttemptsLeft = MAX_EXAM_ATTEMPTS;

        if (enrolled) {
            const p  = await CourseProgress.findOne({ userId, courseId }).lean();
            const ea = await ExamAttempt.findOne({ userId, courseId }).lean();
            if (p)  progress = p;
            if (ea) examAttemptsLeft = Math.max(0, MAX_EXAM_ATTEMPTS - ea.attempts);
        }

        res.json({ ok: true, enrolled, progress, examAttemptsLeft });
    } catch (err) {
        console.error('Access check error:', err);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// ─── POST /api/premium/submit-exam ───────────────────────────────────────────
// Grades MCQ exam. Enforces max 3 attempts. Awards certificate on pass.
router.post('/submit-exam', requireAuth, async (req, res) => {
    try {
        const { courseId, answers } = req.body;
        if (!courseId || !Array.isArray(answers)) {
            return res.status(400).json({ ok: false, message: 'courseId and answers[] are required' });
        }

        const userId = String(req.userId);

        // Enrollment guard
        const enrolled = await isEnrolled(userId, courseId);
        if (!enrolled) return res.status(403).json({ ok: false, message: 'Not enrolled in this course' });

        // Retry limit
        let attemptDoc = await ExamAttempt.findOne({ userId, courseId });
        if (!attemptDoc) {
            attemptDoc = new ExamAttempt({ userId, courseId, attempts: 0 });
        }
        if (attemptDoc.attempts >= MAX_EXAM_ATTEMPTS) {
            return res.status(403).json({
                ok: false,
                message: `Maximum ${MAX_EXAM_ATTEMPTS} attempts reached. You cannot retake this exam.`,
                attemptsLeft: 0
            });
        }

        // Fetch course quiz
        const course = await Course.findOne({
            $or: [
                { _id: courseId.match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: courseId },
                { title: courseId }
            ]
        });
        if (!course || !course.quizQuestions || course.quizQuestions.length === 0) {
            return res.status(400).json({ ok: false, message: 'No quiz questions found for this course' });
        }

        // Grade
        const correctKeys = course.quizQuestions.map(q => q.correctIndex);
        let correct = 0;
        answers.forEach((ans, i) => {
            if (String(ans) === String(correctKeys[i])) correct++;
        });
        const total     = correctKeys.length;
        const score     = Math.round((correct / total) * 100);
        const passmark  = course.examPassPercent || 60;
        const passed    = score >= passmark;

        // Increment attempt
        attemptDoc.attempts   += 1;
        attemptDoc.lastAttempt = new Date();
        await attemptDoc.save();

        const attemptsLeft = Math.max(0, MAX_EXAM_ATTEMPTS - attemptDoc.attempts);

        // Update CourseProgress
        let progress = await CourseProgress.findOne({ userId, courseId });
        if (!progress) progress = new CourseProgress({ userId, courseId });

        progress.score      = score;
        progress.testPassed = passed;
        if (passed) {
            if (!progress.certId) {
                progress.certId   = 'RENV-' + Date.now().toString(36).toUpperCase();
                progress.earnedAt = new Date();
            }
            progress.isCompleted    = true;
            progress.progressPercent= 100;
        }
        progress.updatedAt = new Date();
        await progress.save();

        // Activity & TestResult logs
        try {
            const TestResult = require('../models/TestResult');
            const Activity2  = require('../models/Activity');
            await TestResult.create({ userId, courseId, courseName: course.title, score, passed, totalQuestions: total, correctQuestions: correct });
            await Activity2.create({ userId, type: passed ? 'test_passed' : 'test_failed', title: `Final Exam: ${course.title}`, courseId, courseName: course.title, score });
            if (passed) {
                await Activity2.create({ userId, type: 'certificate_earned', title: `Certificate: ${course.title}`, courseId, courseName: course.title });
            }
        } catch (e) { console.warn('Log error:', e.message); }

        const user = await User.findById(userId);
        res.json({
            ok: true,
            passed,
            score,
            correct,
            total,
            attemptsLeft,
            certId:   passed ? progress.certId : null,
            earnedAt: passed ? progress.earnedAt : null,
            userName: user ? user.name : 'Student'
        });
    } catch (err) {
        console.error('Submit-exam error:', err);
        res.status(500).json({ ok: false, message: 'Server error grading exam' });
    }
});

// ─── GET /api/premium/certificate/:courseId ───────────────────────────────────
// Returns certificate info for a passed course.
router.get('/certificate/:courseId', requireAuth, async (req, res) => {
    try {
        const userId   = String(req.userId);
        const { courseId } = req.params;

        const progress = await CourseProgress.findOne({ userId, courseId, testPassed: true }).lean();
        if (!progress || !progress.certId) {
            return res.status(404).json({ ok: false, message: 'Certificate not found. Pass the exam first.' });
        }

        const user   = await User.findById(userId).lean();
        const course = await Course.findById(courseId).lean()
            || await Course.findOne({ slug: courseId }).lean()
            || await Course.findOne({ title: courseId }).lean();

        res.json({
            ok:       true,
            certId:   progress.certId,
            earnedAt: progress.earnedAt,
            score:    progress.score,
            userName: user ? user.name  : 'Student',
            userEmail: user ? user.email : '',
            courseName: course ? course.title : courseId
        });
    } catch (err) {
        console.error('Certificate fetch error:', err);
        res.status(500).json({ ok: false, message: 'Server error fetching certificate' });
    }
});

// ─── GET /api/premium/all-courses ────────────────────────────────────────────
// Public — lists ALL active courses (free + premium) merged.
// If user is logged in (optionalAuth), each course is annotated with
// { enrolled, progress }. Quiz answer keys are never exposed here.
router.get('/all-courses', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true })
            .select('-quizQuestions.correctIndex -__v')
            .lean();

        const userId = req.userId || null;

        const annotated = await Promise.all(courses.map(async c => {
            let enrolled = false;
            let progress = null;

            if (userId) {
                enrolled = await isEnrolled(userId, String(c._id));
                if (enrolled) {
                    const p = await CourseProgress.findOne({
                        userId: String(userId),
                        courseId: String(c._id)
                    }).lean();
                    if (p) progress = { progressPercent: p.progressPercent || 0, isCompleted: p.isCompleted || false, certId: p.certId || null };
                }
            }

            return { ...c, enrolled, progress };
        }));

        res.json({ ok: true, courses: annotated });
    } catch (err) {
        console.error('GET /premium/all-courses error:', err);
        res.status(500).json({ ok: false, message: 'Failed to fetch courses' });
    }
});

module.exports = router;

