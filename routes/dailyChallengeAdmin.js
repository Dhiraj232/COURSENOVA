const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parsePDF, normalizeAIQuestions } = require('../services/pdfParsingService');
const { extractQuestionsFromPdf } = require('../services/aiService');
const PDFDocument = require('pdfkit');
const DailyChallenge = require('../models/DailyChallenge');
const PdfJob = require('../models/PdfJob');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    }
});

// GET /api/admin/daily-challenge/pdf-questions/:date
router.get('/pdf-questions/:date', requireAuth, async (req, res) => {
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
router.get('/pdf-solutions/:date', requireAuth, async (req, res) => {
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
        await updateJob(jobId, 5, 'Initializing Parser', 'Starting local PDF parsing engine...');
        
        let questions = [];
        try {
            // Run standard offline parser first (matching mock test functionality)
            questions = await parsePDF(pdfBuffer, { category: 'Daily Challenge', subject: examType || 'General' }, expectedCount, (progress, stage, log) => {
                updateJob(jobId, progress, stage, log);
            });
            console.log(`[PDF Job ${jobId}] Offline parser completed. Questions extracted: ${questions.length}`);
        } catch (parseErr) {
            console.warn('[Warning] Offline parser failed:', parseErr.message);
            await updateJob(jobId, undefined, undefined, `Offline parser warning: ${parseErr.message}`);
        }

        // If offline parser fails to find any questions, try Gemini AI as a robust fallback
        if (questions.length === 0) {
            try {
                await updateJob(jobId, 45, 'Gemini AI Fallback', 'Offline parser found 0 questions. Trying Gemini AI fallback parser...');
                const aiQuestions = await extractQuestionsFromPdf(pdfBuffer, { category: 'Daily Challenge', subject: examType || 'General' });
                await updateJob(jobId, 80, 'Normalizing Questions', 'Standardizing Gemini AI questions schema...');
                questions = normalizeAIQuestions(aiQuestions, 'Daily Challenge', examType || 'General');
            } catch (aiErr) {
                console.error('[Error] Gemini AI fallback also failed:', aiErr.message);
                await updateJob(jobId, undefined, undefined, `Gemini AI error: ${aiErr.message}`);
            }
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
}, requireAdmin, upload.single('pdf'), async (req, res) => {
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
router.post('/save', requireAdmin, async (req, res) => {
    try {
        const { date, title, questions, examType } = req.body;
        
        // WIPE OUT previous daily challenge questions completely for this date & examType
        await DailyChallenge.deleteMany({ date, examType });
        
        // Recreate it clean with the new questions from PDF
        const challenge = new DailyChallenge({
            date,
            title,
            examType,
            questions,
            totalQuestions: questions.length,
            durationMinutes: Math.max(15, questions.length) // 1 min per question, minimum 15 mins
        });
        await challenge.save();

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: 'Failed to save challenge' });
    }
});

module.exports = router;
