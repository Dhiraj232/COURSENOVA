const express = require('express');
const router = express.Router();
const CourseProgress = require('../models/CourseProgress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Activity = require('../models/Activity');
const TestResult = require('../models/TestResult');
const { requireAuth } = require('../middleware/auth');
const { checkAccess } = require('../utils/accessControl');

// All routes in this file require authentication
router.use(requireAuth);

// ── GET /api/course/details ─────────────────────────────────────────────────────
// Returns course lessons + quiz quiz questions for enrolled users or free courses
router.get('/details', async (req, res) => {
    try {
        const { courseId } = req.query;
        if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

        // Enforce Access Check
        const hasAccess = await checkAccess(req.userId, courseId);
        if (!hasAccess) {
            return res.status(403).json({ ok: false, message: 'Access denied. Please enroll to view course content.' });
        }

        const orQuery = [
            { title: courseId },
            { slug: courseId.toLowerCase().replace(/\s+/g, '-') }
        ];
        if (String(courseId).match(/^[0-9a-fA-F]{24}$/)) {
            orQuery.push({ _id: courseId });
        }
        
        const course = await Course.findOne({ $or: orQuery });

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
        const hasAccess = await checkAccess(req.userId, courseId);

        if (!hasAccess) {
            return res.status(403).json({ ok: false, message: 'Course not purchased. Please enroll to access this course.' });
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

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${req.userId}`).emit('dashboard_update', {
                type: 'PROGRESS_UPDATE',
                courseId: courseId,
                progress: record.progressPercent,
                message: `Progress updated: ${record.progressPercent}%`
            });
        }
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
        const { courseId, answers, correctAnswers } = req.body;

        // Enforce Access Check
        const hasAccess = await checkAccess(req.userId, courseId);
        if (!hasAccess) {
            return res.status(403).json({ ok: false, message: 'You must be enrolled to take the test.' });
        }

        console.log('Incoming submit-test body:', req.body);
        
        if (!courseId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ ok: false, message: 'courseId and valid answers array are required' });
        }

        let dbCorrectAnswers = correctAnswers || [];
        let course = await Course.findOne({
            $or: [
                { title: courseId },
                { slug: courseId.toLowerCase().replace(/\s+/g, '-') },
                { _id: courseId.match(/^[0-9a-fA-F]{24}$/) ? courseId : null }
            ].filter(q => q._id !== null)
        });

        if (course && course.quizQuestions && course.quizQuestions.length > 0) {
            dbCorrectAnswers = course.quizQuestions.map(q => q.correctIndex);
        }

        if (!dbCorrectAnswers || dbCorrectAnswers.length === 0) {
            return res.status(400).json({ ok: false, message: 'No quiz answers available for grading.' });
        }

        // Grade
        let correct = 0;
        answers.forEach((ans, i) => { if (String(ans) === String(dbCorrectAnswers[i])) correct++; });
        const total = dbCorrectAnswers.length;
        const score = Math.round((correct / total) * 100);
        const passed = score >= 60;

        let record = await CourseProgress.findOne({ userId: req.userId, courseId });
        if (!record) record = new CourseProgress({ userId: req.userId, courseId });

        record.score = score;
        record.testPassed = passed;

        if (passed) {
            // Guard: must have watched at least one lesson (if lessons exist)
            if (course && course.lessons.length > 0 && 
                !record.videoWatched && record.completedVideos.length === 0 && record.completedLessons.length === 0) {
                return res.status(403).json({ ok: false, message: 'Please complete at least one course lesson before taking the test.' });
            }

            if (!record.certId) {
                record.certId = 'RENV-' + Date.now().toString(36).toUpperCase();
                record.earnedAt = new Date();
            }

            record.isCompleted = true;
            record.progressPercent = 100;
        }

        record.updatedAt = new Date();
        await record.save();

        // Dashboard Logging
        try {
            const TestResult = require('../models/TestResult');
            const Activity = require('../models/Activity');

            await TestResult.create({
                userId: req.userId,
                courseId,
                courseName: course ? course.title : courseId,
                score,
                passed,
                totalQuestions: total,
                correctQuestions: correct
            });

            await Activity.create({
                userId: req.userId,
                type: passed ? 'test_passed' : 'test_failed',
                title: `Final Test: ${course ? course.title : courseId}`,
                courseId,
                courseName: course ? course.title : courseId,
                score
            });

            if (passed) {
                await Activity.create({
                    userId: req.userId,
                    type: 'certificate_earned',
                    title: `Certificate: ${course ? course.title : courseId}`,
                    courseId,
                    courseName: course ? course.title : courseId
                });
            }
        } catch (logErr) {
            console.error('Logging Error:', logErr);
        }

        const user = await User.findById(req.userId);
        res.json({
            ok: true,
            passed, score, correct, total,
            certId: record.certId,
            earnedAt: record.earnedAt,
            userName: user ? user.name : 'Student'
        });

        // ── Real-time Dashboard Update ──
        if (req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user:${req.userId}`).emit('dashboard_update', {
                type: passed ? 'TEST_PASSED' : 'TEST_FAILED',
                title: course ? course.title : courseId,
                score: score,
                message: passed ? `Congratulations! You passed the test for ${course ? course.title : courseId}` : `Test attempt completed for ${course ? course.title : courseId}`
            });
        }
    } catch (err) {
        console.error('Submit test error:', err);
        res.status(500).json({ ok: false, message: 'Failed to submit test', error: err.message });
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
