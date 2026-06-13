const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : async function(buffer) {
    const { PDFParse } = pdfParseModule;
    if (PDFParse) {
        const parser = new PDFParse({ verbosity: 0, data: buffer });
        const result = await parser.getText();
        return { text: result.text || '' };
    }
    throw new Error('pdf-parse module is not a function and does not export PDFParse');
};
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


// Helper to parse questions from raw text using regex
function parseQuestionsFromText(text) {
    const questions = [];
    // Split text into lines and clean up
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentQuestion = null;

    lines.forEach(line => {
        // Look for question start: "1. " or "1) "
        const qMatch = line.match(/^(\d+)[.)]\s+(.*)/);
        if (qMatch) {
            if (currentQuestion) questions.push(currentQuestion);
            currentQuestion = {
                question: qMatch[2],
                options: [],
                correctAnswer: '',
                explanation: 'Extracted from PDF'
            };
            return;
        }

        // Look for options: "A) " or "A. "
        const optMatch = line.match(/^([A-D])[.)]\s+(.*)/);
        if (optMatch && currentQuestion) {
            currentQuestion.options.push(optMatch[2]);
            // Default first option as correct if not specified (manual check recommended)
            if (currentQuestion.options.length === 1) {
                currentQuestion.correctAnswer = optMatch[2];
            }
            return;
        }

        // Append to current question if it's a continuation line
        if (currentQuestion && !optMatch && !qMatch && currentQuestion.options.length === 0) {
            currentQuestion.question += ' ' + line;
        }
    });

    if (currentQuestion) questions.push(currentQuestion);
    return questions;
}

// POST /api/admin/daily-challenge/upload
router.post('/upload', requireAuth, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No PDF uploaded' });
        const { date, title, examType } = req.body;
        const pdfBuffer = req.file.buffer;
        
        const data = await pdfParse(pdfBuffer);
        const questions = parseQuestionsFromText(data.text);

        res.json({ ok: true, questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Failed to process PDF' });
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
