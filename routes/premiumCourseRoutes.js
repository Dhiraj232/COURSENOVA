const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const ExamAttempt = require('../models/ExamAttempt');
const { checkAccess } = require('../utils/accessControl');

const MAX_EXAM_ATTEMPTS = 3;

// ─── GET /api/premium/courses ─────────────────────────────────────────────────
// Public — lists all active premium/free courses. Strips quiz answers.
router.get('/courses', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({
            isActive: true 
        })
            .select('-quizQuestions.correctIndex -__v')
            .lean();

        const userId = req.userId || null;
        let annotated;

        if (userId) {
            // Batch load user, enrollments and progress records
            const [user, enrollments, progressList] = await Promise.all([
                User.findById(userId).lean(),
                Enrollment.find({ userId: String(userId) }).lean(),
                CourseProgress.find({ userId: String(userId) }).lean()
            ]);

            const progressMap = {};
            progressList.forEach(p => {
                progressMap[String(p.courseId)] = p;
            });

            annotated = courses.map(c => {
                let enrolled = false;

                if (c.isFree || c.price === 0) {
                    enrolled = true;
                } else if (user) {
                    const hasEnrollment = enrollments.some(e => 
                        String(e.courseId) === String(c._id) || 
                        String(e.courseId) === String(c.id || c._id) ||
                        e.courseName === c.title
                    );

                    if (hasEnrollment) {
                        enrolled = true;
                    } else if ((user.purchasedMockTest || user.hasMockSeriesAccess) && c.category === 'State Boards') {
                        enrolled = true;
                    } else {
                        const courseList = [...(user.purchasedCourses || []), ...(user.enrolledCourses || [])];
                        enrolled = courseList.some(enrolledId => {
                            const lowerId = String(enrolledId).toLowerCase();
                            return (
                                lowerId === String(c._id).toLowerCase() ||
                                (c.id && lowerId === String(c.id).toLowerCase()) ||
                                (c.slug && lowerId === String(c.slug).toLowerCase()) ||
                                lowerId === String(c.title).toLowerCase()
                            );
                        });
                    }
                }

                let progress = null;
                if (enrolled) {
                    const p = progressMap[String(c._id)];
                    if (p) progress = { progressPercent: p.progressPercent, isCompleted: p.isCompleted };
                }

                return { ...c, enrolled, progress };
            });
        } else {
            annotated = courses.map(c => {
                const enrolled = (c.isFree || c.price === 0);
                return { ...c, enrolled, progress: null };
            });
        }

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
                { slug: String(courseId).toLowerCase().trim() },
                { slug: String(courseId).toLowerCase().replace(/-/g, ' ').trim() },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-').trim() },
                { title: String(courseId) }
            ].filter(q => q._id !== null || q.slug || q.title)
        }).lean();
        
        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });

        const userId = req.userId || null;
        let enrolled = await checkAccess(userId, String(course._id));

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

// ─── GET /api/premium/access/:courseId ───────────────────────────────────────
// Returns enrollment status + progress + exam attempts left.
router.get('/access/:courseId', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = String(req.userId);
        
        // Find course first to get exact _id or slug
        const course = await Course.findOne({
            $or: [
                { _id: String(courseId).match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: String(courseId).toLowerCase().trim() },
                { slug: String(courseId).toLowerCase().replace(/-/g, ' ').trim() },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-').trim() },
                { title: String(courseId) }
            ].filter(q => q._id !== null || q.slug || q.title)
        });

        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });
        const enrolled = await checkAccess(userId, String(course._id));

        let progress = null;
        let examAttemptsLeft = MAX_EXAM_ATTEMPTS;

        if (enrolled) {
            const p  = await CourseProgress.findOne({ 
                userId, 
                $or: [{ courseId: String(course._id) }, { courseId: course.slug }] 
            }).lean();
            const ea = await ExamAttempt.findOne({ 
                userId, 
                $or: [{ courseId: String(course._id) }, { courseId: course.slug }] 
            }).lean();
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

        // Fetch course quiz
        const course = await Course.findOne({
            $or: [
                { _id: courseId.match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: String(courseId).toLowerCase().trim() },
                { slug: String(courseId).toLowerCase().replace(/-/g, ' ').trim() },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-').trim() },
                { title: courseId }
            ].filter(q => q._id !== null || q.slug || q.title)
        });
        if (!course) {
            return res.status(404).json({ ok: false, message: 'Course not found' });
        }

        // Enrollment guard
        const enrolled = await checkAccess(userId, String(course._id));
        if (!enrolled) return res.status(403).json({ ok: false, message: 'Not enrolled in this course' });

        // Retry limit (check under both course ID and course slug for backward compatibility)
        let attemptDoc = await ExamAttempt.findOne({ 
            userId, 
            $or: [{ courseId: String(course._id) }, { courseId: course.slug }] 
        });
        if (!attemptDoc) {
            attemptDoc = new ExamAttempt({ userId, courseId: String(course._id), attempts: 0 });
        }
        if (attemptDoc.attempts >= MAX_EXAM_ATTEMPTS) {
            return res.status(403).json({
                ok: false,
                message: `Maximum ${MAX_EXAM_ATTEMPTS} attempts reached. You cannot retake this exam.`,
                attemptsLeft: 0
            });
        }

        if (!course.quizQuestions || course.quizQuestions.length === 0) {
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
        let progress = await CourseProgress.findOne({ 
            userId, 
            $or: [{ courseId: String(course._id) }, { courseId: course.slug }] 
        });
        if (!progress) progress = new CourseProgress({ userId, courseId: String(course._id) });

        progress.score      = score;
        progress.testPassed = passed;
        if (passed) {
            if (!progress.certId) {
                progress.certId   = 'RENV-' + Date.now().toString(36).toUpperCase();
                progress.courseName = course.title;
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
            await TestResult.create({ userId, courseId: String(course._id), courseName: course.title, score, passed, totalQuestions: total, correctQuestions: correct });
            await Activity2.create({ userId, type: passed ? 'test_passed' : 'test_failed', title: `Final Exam: ${course.title}`, courseId: String(course._id), courseName: course.title, score });
            if (passed) {
                await Activity2.create({ userId, type: 'certificate_earned', title: `Certificate: ${course.title}`, courseId: String(course._id), courseName: course.title });
            }
        } catch (e) { console.warn('Log error:', e.message); }

        const user = String(userId).match(/^[0-9a-fA-F]{24}$/) ? await User.findById(userId) : await User.findOne({ email: String(userId) });
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

        const course = await Course.findOne({
            $or: [
                { _id: String(courseId).match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: String(courseId).toLowerCase().trim() },
                { slug: String(courseId).toLowerCase().replace(/-/g, ' ').trim() },
                { slug: String(courseId).toLowerCase().replace(/\s+/g, '-').trim() },
                { title: String(courseId) }
            ].filter(q => q._id !== null || q.slug || q.title)
        });

        if (!course) return res.status(404).json({ ok: false, message: 'Course not found' });

        const progress = await CourseProgress.findOne({ 
            userId, 
            $or: [{ courseId: String(course._id) }, { courseId: course.slug }], 
            testPassed: true 
        }).lean();
        if (!progress || !progress.certId) {
            return res.status(404).json({ ok: false, message: 'Certificate not found. Pass the exam first.' });
        }

        const user = String(userId).match(/^[0-9a-fA-F]{24}$/) ? await User.findById(userId) : await User.findOne({ email: String(userId) });

        res.json({
            ok:       true,
            certId:   progress.certId,
            earnedAt: progress.earnedAt,
            score:    progress.score,
            userName: user ? user.name  : 'Student',
            userEmail: user ? user.email : '',
            courseName: course.title
        });
    } catch (err) {
        console.error('Certificate fetch error:', err);
        res.status(500).json({ ok: false, message: 'Server error fetching certificate' });
    }
});

// ─── GET /api/premium/all-courses ────────────────────────────────────────────
// Public — lists ALL active courses merged.
router.get('/all-courses', optionalAuth, async (req, res) => {
    try {
        const courses = await Course.find({ isActive: true })
            .select('-quizQuestions.correctIndex -__v')
            .lean();

        const userId = req.userId || null;
        let annotated;

        if (userId) {
            // Batch load user, enrollments and progress records
            const [user, enrollments, progressList] = await Promise.all([
                User.findById(userId).lean(),
                Enrollment.find({ userId: String(userId) }).lean(),
                CourseProgress.find({ userId: String(userId) }).lean()
            ]);

            const progressMap = {};
            progressList.forEach(p => {
                progressMap[String(p.courseId)] = p;
            });

            annotated = courses.map(c => {
                let enrolled = false;

                if (c.isFree || c.price === 0) {
                    enrolled = true;
                } else if (user) {
                    const hasEnrollment = enrollments.some(e => 
                        String(e.courseId) === String(c._id) || 
                        String(e.courseId) === String(c.id || c._id) ||
                        e.courseName === c.title
                    );

                    if (hasEnrollment) {
                        enrolled = true;
                    } else if ((user.purchasedMockTest || user.hasMockSeriesAccess) && c.category === 'State Boards') {
                        enrolled = true;
                    } else {
                        const courseList = [...(user.purchasedCourses || []), ...(user.enrolledCourses || [])];
                        enrolled = courseList.some(enrolledId => {
                            const lowerId = String(enrolledId).toLowerCase();
                            return (
                                lowerId === String(c._id).toLowerCase() ||
                                (c.id && lowerId === String(c.id).toLowerCase()) ||
                                (c.slug && lowerId === String(c.slug).toLowerCase()) ||
                                lowerId === String(c.title).toLowerCase()
                            );
                        });
                    }
                }

                let progress = null;
                if (enrolled) {
                    const p = progressMap[String(c._id)];
                    if (p) progress = { progressPercent: p.progressPercent || 0, isCompleted: p.isCompleted || false, certId: p.certId || null };
                }

                return { ...c, enrolled, progress };
            });
        } else {
            annotated = courses.map(c => {
                const enrolled = (c.isFree || c.price === 0);
                return { ...c, enrolled, progress: null };
            });
        }

        res.json({ ok: true, courses: annotated });
    } catch (err) {
        console.error('GET /premium/all-courses error:', err);
        res.status(500).json({ ok: false, message: 'Failed to fetch courses' });
    }
});

module.exports = router;
