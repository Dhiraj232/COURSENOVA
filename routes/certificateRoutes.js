const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const CourseProgress = require('../models/CourseProgress');
const User = require('../models/User');
const { generateCertificate } = require('../controllers/certificateController');
const { sendCertificateEmail } = require('../controllers/emailController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

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
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: 'Login required' });

    const { certId } = req.params;

    try {
        // Find progress record containing this certId
        const record = await CourseProgress.findOne({ userId, certId });
        if (!record || !record.testPassed) {
            return res.status(403).json({ ok: false, message: 'Certificate not earned yet.' });
        }

        const user = await User.findById(userId);
        const userName = user ? user.name : 'Student';

        const completionDate = record.earnedAt
            ? new Date(record.earnedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

        const { filePath, fileName } = await generateCertificate({
            userName,
            courseName: record.courseId, // courseId stores the course name in this system
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

module.exports = router;
