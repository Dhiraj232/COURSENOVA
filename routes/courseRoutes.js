const express = require('express');
const router = express.Router();
const CourseProgress = require('../models/CourseProgress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Activity = require('../models/Activity');
const TestResult = require('../models/TestResult');
const { requireAuth } = require('../middleware/auth');

// All routes in this file require authentication
router.use(requireAuth);

// ── GET /api/course/details ─────────────────────────────────────────────────────
// Returns course lessons + quiz questions — ALL COURSES FREE, no enrollment check
router.get('/details', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

    try {
        // All courses are freely accessible — no enrollment check
        const course = await Course.findOne({
            $or: [
                { title: courseId },
                { slug: courseId.toLowerCase().replace(/\s+/g, '-') }
            ]
        });

        const progress = await CourseProgress.findOne({ userId: req.userId, courseId });

        res.json({
            ok: true,
            course: course ? {
                _id: course._id,
                title: course.title,
                slug: course.slug,
                description: course.description,
                icon: course.icon,
                lessons: course.lessons || [],
                quizQuestions: course.quizQuestions || [],
                videoUrl: course.videoUrl,
                pdfUrl: course.pdfUrl
            } : null,
            progress: progress ? {
                progressPercent: progress.progressPercent,
                completedLessons: progress.completedLessons,
                videoWatched: progress.videoWatched,
                pdfRead: progress.pdfRead,
                isCompleted: progress.isCompleted,
                testPassed: progress.testPassed,
                certId: progress.certId
            } : null
        });
    } catch (err) {
        console.error('Course details error:', err);
        res.status(500).json({ ok: false, message: 'Server error fetching course details' });
    }
});

// ── GET /api/course/access-check ─────────────────────────────────────────────
router.get('/access-check', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

    try {
        const enrollment = await Enrollment.findOne({ userId: req.userId, courseId });

        if (!enrollment) {
            const user = await User.findById(req.userId);
            const legacyEnrolled = user && user.enrolledCourses &&
                (user.enrolledCourses.includes(courseId) || user.enrolledCourses.some(c =>
                    c.toLowerCase().includes(courseId.toLowerCase()) ||
                    courseId.toLowerCase().includes(c.toLowerCase())
                ));
            if (!legacyEnrolled) {
                return res.status(403).json({ ok: false, message: 'Course not purchased. Please enroll to access this course.' });
            }
        }

        const progress = await CourseProgress.findOne({ userId: req.userId, courseId });
        res.json({
            ok: true,
            enrolled: true,
            progress: progress ? {
                progressPercent: progress.progressPercent,
                isCompleted: progress.isCompleted,
                completedLessons: progress.completedLessons,
                completedVideos: progress.completedVideos,
                completedTests: progress.completedTests,
                videoWatched: progress.videoWatched,
                pdfRead: progress.pdfRead,
                certId: progress.certId
            } : null
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error checking enrollment' });
    }
});

// ── GET /api/course/progress ──────────────────────────────────────────────────
router.get('/progress', async (req, res) => {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

    try {
        const record = await CourseProgress.findOne({ userId: req.userId, courseId });
        res.json({ ok: true, record: record || null });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch progress' });
    }
});

const handleProgress = async (req, res) => {
    const { courseId, lessonId, videoId, testId, videoWatched, pdfRead, totalLessons, totalVideos = 1, totalTests = 1 } = req.body;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

    try {
        let record = await CourseProgress.findOne({ userId: req.userId, courseId });
        if (!record) {
            record = new CourseProgress({ userId: req.userId, courseId });
        }

        // Per-lesson tracking (new)
        if (lessonId && !record.completedLessons.includes(lessonId)) {
            record.completedLessons.push(lessonId);
            const course = await Course.findOne({
                $or: [{ title: courseId }, { slug: courseId.toLowerCase().replace(/\s+/g, '-') }]
            });
            await Activity.create({
                userId: req.userId,
                type: 'lesson_completed',
                title: lessonId,
                courseId: courseId,
                courseName: course ? course.title : courseId
            });
        }

        // Legacy granular tracking
        if (videoId && !record.completedVideos.includes(videoId)) {
            record.completedVideos.push(videoId);
        }
        if (testId && !record.completedTests.includes(testId)) {
            record.completedTests.push(testId);
        }

        // Legacy boolean flags
        if (videoWatched !== undefined) record.videoWatched = videoWatched;
        if (pdfRead !== undefined) record.pdfRead = pdfRead;

        // Compute progress percent
        if (totalLessons && totalLessons > 0) {
            // New multi-lesson formula: lesson completion drives progress (80%), test (20%)
            const lessonPct = (record.completedLessons.length / totalLessons) * 80;
            const testPct = record.testPassed ? 20 : 0;
            record.progressPercent = Math.min(100, Math.round(lessonPct + testPct));
        } else {
            // Legacy formula: 50% video + 50% test
            const videoPct = totalVideos > 0 ? (record.completedVideos.length / totalVideos) * 50 : (record.videoWatched ? 50 : 0);
            const testPct = totalTests > 0 ? (record.completedTests.length / totalTests) * 50 : (record.pdfRead ? 50 : 0);
            record.progressPercent = Math.min(100, Math.round(videoPct + testPct));
        }

        record.updatedAt = new Date();
        await record.save();
        res.json({ ok: true, record });
    } catch (err) {
        console.error('Progress update error:', err);
        res.status(500).json({ ok: false, message: 'Failed to save progress' });
    }
};

router.post('/progress', handleProgress);
router.post('/save-progress', handleProgress);

// ── POST /api/course/submit-test ──────────────────────────────────────────────
router.post('/submit-test', async (req, res) => {
    try {
        console.log('Incoming submit-test body:', req.body);
        const { courseId, answers, correctAnswers } = req.body;
        
        if (!courseId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ ok: false, message: 'courseId and valid answers array are required' });
        }

        const safeUserId = (req.user && req.user.id) ? req.user.id : (req.userId ? req.userId : null);

        let dbCorrectAnswers = correctAnswers || [];
        let course = null;
        
        try {
            course = await Course.findOne({
                $or: [
                    { title: courseId },
                    { slug: courseId.toLowerCase().replace(/\s+/g, '-') }
                ]
            });
        } catch(e) {
            console.log("Course fetch error, maybe invalid courseId format", e);
        }

        if (course && course.quizQuestions && course.quizQuestions.length > 0) {
            dbCorrectAnswers = course.quizQuestions.map(q => q.correctIndex);
        }

        if (!dbCorrectAnswers || dbCorrectAnswers.length === 0) {
            return res.status(400).json({ ok: false, message: 'No quiz answers available for grading.' });
        }

        let correct = 0;
        answers.forEach((ans, i) => { 
            if (String(ans) === String(dbCorrectAnswers[i])) correct++; 
        });
        const total = dbCorrectAnswers.length || 1;
        const score = Math.round((correct / total) * 100);
        const passed = score >= 60;

        let record = null;
        let certId = null;
        let earnedAt = null;

        if (safeUserId) {
            try {
                record = await CourseProgress.findOne({ userId: safeUserId, courseId });
                if (!record) {
                    record = new CourseProgress({ userId: safeUserId, courseId });
                }

                record.score = score;
                record.testPassed = passed;

                if (passed) {
                    if (!record.certId) {
                        record.certId = 'RENV-' + Date.now().toString(36).toUpperCase();
                        record.earnedAt = new Date();
                    }
                    record.isCompleted = true;
                    record.progressPercent = 100;
                }

                record.updatedAt = new Date();
                await record.save();
                
                certId = record.certId;
                earnedAt = record.earnedAt;
            } catch (err) {
                console.error("Error saving CourseProgress:", err.message);
            }

            // Dashboard Logging
            try {
                const tr = require('../models/TestResult');
                const act = require('../models/Activity');

                await tr.create({
                    userId: safeUserId,
                    courseId,
                    courseName: course ? course.title : courseId,
                    score,
                    passed,
                    totalQuestions: total,
                    correctQuestions: correct
                });

                await act.create({
                    userId: safeUserId,
                    type: passed ? 'test_passed' : 'test_failed',
                    title: `Final Test: ${course ? course.title : courseId}`,
                    courseId,
                    courseName: course ? course.title : courseId,
                    score
                });

                if (passed) {
                    await act.create({
                        userId: safeUserId,
                        type: 'certificate_earned',
                        title: `Certificate: ${course ? course.title : courseId}`,
                        courseId,
                        courseName: course ? course.title : courseId
                    });
                }
            } catch (logErr) {
                console.error('Logging Error:', logErr.message);
            }
        } else {
             // If user is undefined/anonymous but we want it to work (optional-safe)
             if (passed) {
                 certId = 'RENV-' + Date.now().toString(36).toUpperCase();
                 earnedAt = new Date();
             }
        }

        let user = null;
        if (safeUserId) {
            try {
                user = await User.findById(safeUserId);
            } catch (e) {
                console.error("User fetch error:", e.message);
            }
        }

        return res.json({
            ok: true,
            passed,
            score,
            correct,
            total,
            certId: certId,
            earnedAt: earnedAt,
            userName: user ? user.name : 'Student'
        });
    } catch (err) {
        console.error("API ERROR:", err);
        return res.status(500).json({ 
            message: err.message,
            stack: err.stack 
        });
    }
});

// ── GET /api/course/verify-enrollment ────────────────────────────────────────
// All courses are FREE — always return enrolled: true
router.get('/verify-enrollment', async (req, res) => {
    res.json({ ok: true, isEnrolled: true });
});


// ── GET /api/course/my-certificates ──────────────────────────────────────────
router.get('/my-certificates', async (req, res) => {
    try {
        const certs = await CourseProgress.find({
            userId: req.userId,
            testPassed: true,
            certId: { $ne: null }
        });
        const user = await User.findById(req.userId);
        res.json({
            ok: true,
            certificates: certs,
            userName: user ? user.name : 'Student',
            userEmail: user ? user.email : ''
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Failed to fetch certificates' });
    }
});

module.exports = router;
