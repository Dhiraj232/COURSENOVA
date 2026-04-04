const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');

const MAX_EXAM_ATTEMPTS = 3;

// ─── Helper: check if a user is enrolled in a course ─────────────────────────
async function isEnrolled(userId, courseId) {
    if (!userId || !courseId) return false;
    
    try {
        const course = await Course.findOne({
            $or: [
                { _id: String(courseId).match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-') },
                { title: String(courseId) }
            ]
        });
        if (course && course.isFree) return true;

        const searchOrs = [{ courseId: String(courseId) }, { courseName: String(courseId) }];
        if (course) {
            searchOrs.push({ courseId: course.title });
            searchOrs.push({ courseName: course.title });
            if (course.slug) searchOrs.push({ courseId: course.slug });
            searchOrs.push({ courseId: String(course._id) });
        }

        const enrollment = await Enrollment.findOne({ 
            userId: String(userId), 
            $or: searchOrs
        });
        if (enrollment) return true;
    } catch (e) {
        console.warn("isEnrolled error", e.message);
    }

    // Legacy: check User.enrolledCourses string array
    const user = await User.findById(userId);
    return !!(user && user.enrolledCourses &&
        (user.enrolledCourses.includes(String(courseId)) ||
         user.enrolledCourses.some(c =>
            c.toLowerCase() === String(courseId).toLowerCase() ||
            searchOrs.some(s => s.courseId && c.toLowerCase() === String(s.courseId).toLowerCase())
         )
        )
    );
}

// ─── GET /api/premium/courses ─────────────────────────────────────────────────
// Public — lists all active premium courses. Strips quiz answers.
router.get('/courses', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({
            $or: [
                { isPremium: true },
                { isFree: true },
                { price: { $gt: 0 } }
            ],
            isActive: true 
        })
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
        const courseId = req.params.id;
        const course = await Course.findOne({
            $or: [
                { _id: String(courseId).match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-') },
                { title: String(courseId) }
            ]
        }).lean();
        
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });

        const userId = req.userId || null;
        let enrolled = await isEnrolled(userId, String(course._id));

        // ── AUTO-ENROLL for FREE courses if not already enrolled ───────
        if (!enrolled && userId && course.isFree) {
            try {
                await Enrollment.create({
                    userId: String(userId),
                    courseId: String(course._id),
                    courseName: course.title,
                    purchaseDate: new Date(),
                    status: 'approved',
                    amountPaid: 0,
                    utr: 'AUTO-FREE-' + Date.now().toString(36).toUpperCase()
                });
                enrolled = true;
            } catch (err) { console.warn('Auto-enroll error:', err.message); }
        }

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

// Payments are now handled entirely by routes/cashfree.js
// /create-order and /verify-payment endpoints have been migrated there.

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

