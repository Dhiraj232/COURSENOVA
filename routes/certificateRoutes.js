const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const CourseProgress = require('../models/CourseProgress');
const User = require('../models/User');
const { generateCertificate } = require('../controllers/certificateController');
const { sendCertificateEmail } = require('../controllers/emailController');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

const certsDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

function extractUserId(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return payload.userId || payload.id || null;
    } catch {
        return null;
    }
}

// ── GET /api/certificates/generate/:certId ────────────────────────────────────
// Generate (or re-generate) and serve the certificate PDF for a course
router.get('/generate/:certId', async (req, res) => {
    // Note: We'll keep this as a PDF fallback
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    const { certId } = req.params;

    try {
        const record = await CourseProgress.findOne({ userId, certId });
        if (!record || !record.testPassed) {
            return res.status(403).json({ ok: false, message: 'Certificate not earned yet.' });
        }

        const user = await User.findById(userId);
        const completionDate = record.earnedAt
            ? new Date(record.earnedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

        const { filePath, fileName } = await generateCertificate({
            userName: user ? (user.name || user.fullName || 'Student') : 'Student',
            courseName: record.courseName || record.courseId,
            completionDate,
            certId
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error('Certificate Generate Error:', err);
        res.status(500).json({ ok: false, message: 'Failed to generate certificate.' });
    }
});

// ── GET /api/certificates/details/:certId ─────────────────────────────────────
// Fetch data for the professional HTML certificate view (Public Access)
router.get('/details/:certId', async (req, res) => {
    const { certId } = req.params;
    console.log(`[CertAPI] Fetching details for ID: ${certId}`);

    try {
        // Find record by certId (Publicly accessible)
        const record = await CourseProgress.findOne({ certId, testPassed: true }).populate('userId', 'name email');
        
        if (!record) {
            return res.status(404).json({ ok: false, message: 'Certificate record not found.' });
        }

        const student = record.userId;
        
        // Ensure course title instead of ID
        let displayCourseName = record.courseName;
        if (!displayCourseName || displayCourseName.length < 5) {
            try {
                // 1. Try Main Course Collection
                const Course = require('../models/Course'); 
                const course = await Course.findOne({
                    $or: [
                        { _id: String(record.courseId).match(/^[0-9a-fA-F]{24}$/) ? record.courseId : null },
                        { slug: record.courseId }
                    ].filter(q => q._id !== null || q.slug)
                });
                
                if (course) {
                    displayCourseName = course.title;
                } else {
                    // 2. Fallback to Enrollment record (many legacy items store name here)
                    const Enrollment = require('../models/Enrollment');
                    const enroll = await Enrollment.findOne({ 
                        userId: record.userId._id || record.userId, 
                        courseId: record.courseId 
                    });
                    if (enroll && enroll.courseName) displayCourseName = enroll.courseName;
                }
            } catch (e) {
                console.error('Course lookup fail:', e);
                displayCourseName = record.courseId;
            }
        }

        res.json({
            ok: true,
            details: {
                fullName: student ? (student.name || student.fullName) : 'Professional Student',
                email: student ? student.email : '',
                courseName: displayCourseName || record.courseId,
                completionDate: record.earnedAt || record.updatedAt,
                certId: record.certId
            }
        });
    } catch (err) {
        console.error('Cert Details Error:', err);
        res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
    }
});

// ── POST /api/certificates/email/:certId ──────────────────────────────────────
// Generate and email the certificate to the user
router.post('/email/:certId', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    const { certId } = req.params;

    try {
        const record = await CourseProgress.findOne({ userId, certId });
        if (!record || !record.testPassed) {
            return res.status(403).json({ ok: false, message: 'Certificate not earned yet.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found.' });

        const completionDate = record.earnedAt
            ? new Date(record.earnedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

        const { filePath } = await generateCertificate({
            userName: user.name,
            courseName: record.courseId,
            completionDate,
            certId
        });

        await sendCertificateEmail({
            toEmail: user.email,
            userName: user.name,
            courseName: record.courseId,
            certFilePath: filePath,
            certId
        });

        res.json({ ok: true, message: `Certificate emailed to ${user.email}` });
    } catch (err) {
        console.error('Certificate Email Error:', err);
        res.status(500).json({ ok: false, message: 'Failed to send certificate email: ' + err.message });
    }
});

// ── GET /api/certificates/fetch/:userId/:courseId ──────────────────────────────
// Fetch dynamic certificate data for a specific user and course
router.get('/fetch/:userId/:courseId', async (req, res) => {
    const { userId, courseId } = req.params;

    try {
        const record = await CourseProgress.findOne({ userId, courseId, testPassed: true });
        if (!record || !record.certId) {
            return res.status(404).json({ ok: false, message: 'No certificate found for this course.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found.' });

        res.json({
            ok: true,
            details: {
                fullName: user.name || user.fullName || 'Professional Student',
                email: user.email,
                courseName: record.courseName || record.courseId,
                completionDate: record.earnedAt || record.updatedAt,
                certificateId: record.certId
            }
        });
    } catch (err) {
        console.error('Certificate Fetch Error:', err);
        res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
    }
});

// Alias for the exact requirement: GET /api/certificate/:userId/:courseId
router.get('/:userId/:courseId', async (req, res) => {
    const { userId, courseId } = req.params;
    try {
        const record = await CourseProgress.findOne({ userId, courseId, testPassed: true });
        if (!record) return res.status(404).json({ ok: false, message: 'Certificate not found.' });
        
        const user = await User.findById(userId);

        // Enforce Course Title
        let displayCourseName = record.courseName;
        if (!displayCourseName || displayCourseName.length < 5) {
            const Course = require('../models/Course'); 
            const course = await Course.findOne({
                $or: [
                    { _id: String(record.courseId).match(/^[0-9a-fA-F]{24}$/) ? record.courseId : null },
                    { slug: record.courseId }
                ]
            });
            if (course) {
                displayCourseName = course.title;
            } else {
                const Enrollment = require('../models/Enrollment');
                const enroll = await Enrollment.findOne({ userId, courseId });
                if (enroll && enroll.courseName) displayCourseName = enroll.courseName;
            }
        }

        res.json({
            fullName: user ? (user.name || user.fullName) : 'Student',
            courseName: displayCourseName || record.courseId,
            completionDate: record.earnedAt || record.updatedAt,
            certificateId: record.certId
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/certificates/my ──────────────────────────────────────────────────
// List all certificates earned by the logged-in user
router.get('/my', async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    try {
        const records = await CourseProgress.find({ userId, testPassed: true, certId: { $ne: null } });
        const user = await User.findById(userId);
        res.json({
            ok: true,
            certificates: records,
            userName: user ? user.name : 'Student',
            userEmail: user ? user.email : ''
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/certificates/verify/:certId ──────────────────────────────────────
// Public endpoint to verify a certificate ID
router.get('/verify/:certId', async (req, res) => {
    try {
        const { certId } = req.params;
        const record = await CourseProgress.findOne({ certId, testPassed: true })
            .populate('userId', 'name');

        if (!record) {
            return res.status(404).json({ ok: false, message: 'Certificate ID is invalid or not found in our records.' });
        }

        res.json({
            ok: true,
            certificate: {
                studentName: record.userId ? record.userId.name : 'Unknown Student',
                courseName: record.courseId,
                issueDate: record.earnedAt || record.updatedAt,
                certId: record.certId
            }
        });
    } catch (err) {
        res.status(500).json({ ok: false, message: 'Server error during verification.' });
    }
});

module.exports = router;
