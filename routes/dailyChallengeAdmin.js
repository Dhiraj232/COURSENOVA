const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parsePDF, normalizeAIQuestions } = require('../services/pdfParsingService');
const { extractQuestionsFromPdf } = require('../services/aiService');
const PDFDocument = require('pdfkit');
const DailyChallenge = require('../models/DailyChallenge');
const PdfJob = require('../models/PdfJob');
const { requireAuth } = require('../middleware/auth');

async function createJob(type, params) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await PdfJob.create({
        jobId,
        type,
        status: 'processing',
        progress: 0,
        stage: 'Uploading PDF',
        logs: [`[Job Started] ID: ${jobId}, Type: ${type}`],
        result: null,
        error: null,
        totalQuestions: 0,
        imported: 0,
        duplicates: 0,
        failed: 0
    });
    return jobId;
}

async function updateJob(jobId, progress, stage, logMessage) {
    try {
        const update = {};
        if (progress !== undefined) update.progress = progress;
        if (stage !== undefined) update.stage = stage;
        
        const push = {};
        if (logMessage) {
            const timestamp = new Date().toISOString();
            push.logs = `[${timestamp}] ${logMessage}`;
            console.log(`[PDF Job ${jobId}] ${logMessage}`);
        }
        
        const updateObj = {};
        if (Object.keys(update).length > 0) updateObj.$set = update;
        if (Object.keys(push).length > 0) updateObj.$push = push;
        
        await PdfJob.updateOne({ jobId }, updateObj);
    } catch (err) {
        console.error(`Failed to update job ${jobId}:`, err.message);
    }
}

async function completeJob(jobId, result, logMessage = 'Job completed successfully.') {
    try {
        const timestamp = new Date().toISOString();
        const updateObj = {
            status: 'completed',
            progress: 100,
            stage: 'Completed',
            result,
            totalQuestions: result.questions ? result.questions.length : 0
        };
        await PdfJob.updateOne(
            { jobId },
            {
                $set: updateObj,
                $push: { logs: `[${timestamp}] ${logMessage}` }
            }
        );
        console.log(`[PDF Job ${jobId}] ${logMessage}`);
    } catch (err) {
        console.error(`Failed to complete job ${jobId}:`, err.message);
    }
}

async function failJob(jobId, errorMsg) {
    try {
        const timestamp = new Date().toISOString();
        await PdfJob.updateOne(
            { jobId },
            {
                $set: {
                    status: 'failed',
                    stage: 'Failed',
                    error: errorMsg,
                    progress: 100
                },
                $push: { logs: `[${timestamp}] Job failed: ${errorMsg}` }
            }
        );
        console.error(`[PDF Job ${jobId}] Failed: ${errorMsg}`);
    } catch (err) {
        console.error(`Failed to fail job ${jobId}:`, err.message);
    }
}

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


async function runDailyChallengePDFJob(jobId, pdfBuffer, examType, expectedCount, startTime = Date.now()) {
    try {
        await updateJob(jobId, 15, 'Calling Gemini AI', 'Sending PDF to Gemini AI for question extraction...');
        
        let questions = [];
        try {
            const aiQuestions = await extractQuestionsFromPdf(pdfBuffer, { category: 'Daily Challenge', subject: examType || 'General' });
            await updateJob(jobId, 70, 'Normalizing Questions', 'Standardizing parsed questions schema...');
            questions = normalizeAIQuestions(aiQuestions, 'Daily Challenge', examType || 'General');
            await updateJob(jobId, 90, 'Finalizing', 'Completing question parsing...');
        } catch (aiErr) {
            await updateJob(jobId, 40, 'Heuristic Fallback', `Gemini AI failed: ${aiErr.message}. Falling back to heuristic offline parser...`);
            questions = await parsePDF(pdfBuffer, { category: 'Daily Challenge', subject: examType || 'General' }, expectedCount);
        }

        if (questions.length === 0) {
            throw new Error('No MCQ questions detected. Format your PDF with standard MCQ numbering and option blocks (A, B, C, D).');
        }

        await completeJob(jobId, { questions }, `Job complete. Extracted ${questions.length} questions.`);
    } catch (err) {
        await failJob(jobId, err.message);
    }
}

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

        const jobId = await createJob('daily-challenge-pdf', {
            name: req.file.originalname,
            size: req.file.size,
            examType
        });

        setImmediate(() => {
            runDailyChallengePDFJob(jobId, pdfBuffer, examType, expectedCount, req.startTime)
                .catch(err => console.error(`[PDF Job ${jobId}] error:`, err));
        });

        res.json({ ok: true, jobId });
        console.log(`[4] Response sent with jobId - elapsed: ${Date.now() - req.startTime}ms`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Failed to initiate PDF processing: ' + err.message });
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
