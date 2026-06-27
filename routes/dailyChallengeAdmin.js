const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parsePDF } = require('../services/pdfParsingService');
const PDFDocument = require('pdfkit');
const DailyChallenge = require('../models/DailyChallenge');
const { requireAuth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/admin/daily-challenge/pdf-questions/:date
router.get('/pdf-questions/:date', async (req, res) => {
    try {
        const challenge = await DailyChallenge.findOne({ date: req.params.date });
        if (!challenge) return res.status(404).send('Challenge not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Questions_${req.params.date}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text(`SSC CGL Daily Challenge - ${challenge.date}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(challenge.title, { align: 'center' });
        doc.moveDown();

        challenge.questions.forEach((q, i) => {
            doc.fontSize(12).text(`${i + 1}. ${q.question}`, { continued: q.question_hi ? true : false });
            if (q.question_hi) {
                doc.fontSize(12).text(` / ${q.question_hi}`);
            }
            doc.moveDown(0.5);
            q.options.forEach((opt, j) => {
                const optLetter = String.fromCharCode(65 + j);
                doc.fontSize(10).text(`   ${optLetter}) ${opt}`);
            });
            doc.moveDown();
        });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
});

// GET /api/admin/daily-challenge/pdf-solutions/:date
router.get('/pdf-solutions/:date', async (req, res) => {
    try {
        const challenge = await DailyChallenge.findOne({ date: req.params.date });
        if (!challenge) return res.status(404).send('Challenge not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Solutions_${req.params.date}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text(`Answer Key & Explanations - ${challenge.date}`, { align: 'center' });
        doc.moveDown();

        challenge.questions.forEach((q, i) => {
            doc.fontSize(12).text(`${i + 1}. Correct Answer: ${q.correctAnswer}`, { weight: 'bold' });
            if (q.explanation) {
                doc.fontSize(10).text(`   Explanation: ${q.explanation}`);
            }
            if (q.explanation_hi) {
                doc.fontSize(10).text(`   व्याख्या: ${q.explanation_hi}`);
            }
            doc.moveDown();
        });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
});


// POST /api/admin/daily-challenge/upload
router.post('/upload', (req, res, next) => {
    req.startTime = Date.now();
    console.log('[1] Upload started');
    next();
}, requireAuth, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No PDF uploaded' });
        const uploadDuration = Date.now() - req.startTime;
        console.log(`[2] PDF received (size: ${req.file.size} bytes) - elapsed: ${uploadDuration}ms`);

        const { examType } = req.body;
        const pdfBuffer = req.file.buffer;
        
        const expectedCount = req.query.expectedCount || req.body.expectedCount || 100;
        const questions = await parsePDF(pdfBuffer, { category: 'Daily Challenge', subject: examType || 'General' }, expectedCount);
        console.log(`[3] Text extraction and parsing completed - elapsed: ${Date.now() - req.startTime}ms`);

        if (questions.length === 0) {
            res.json({
                ok: false,
                error: '❌ No MCQ questions detected. Format your PDF with standard MCQ numbering and option blocks (A, B, C, D).'
            });
            console.log(`[4] Response sent - elapsed: ${Date.now() - req.startTime}ms`);
            return;
        }

        res.json({ ok: true, questions });
        console.log(`[4] Response sent - elapsed: ${Date.now() - req.startTime}ms`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Failed to process PDF: ' + err.message });
    }
});

// POST /api/admin/daily-challenge/save
router.post('/save', async (req, res) => {
    try {
        const { date, title, questions, examType } = req.body;
        
        // Find if already exists for this date AND examType
        let challenge = await DailyChallenge.findOne({ date, examType });
        if (challenge) {
            challenge.questions = questions;
            challenge.title = title;
            await challenge.save();
        } else {
            challenge = new DailyChallenge({ date, title, examType, questions });
            await challenge.save();
        }

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Failed to save challenge' });
    }
});

module.exports = router;
