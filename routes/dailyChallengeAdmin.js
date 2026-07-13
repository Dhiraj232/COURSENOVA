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
        uploadProgress: 100,
        ocrProgress: 0,
        aiProgress: 0,
        validationProgress: 0,
        importProgress: 0,
        estimatedTime: 'Estimating...',
        warningsCount: 0,
        errorsCount: 0,
        validationErrors: [],
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

async function updateJob(jobId, updates, stage, logMessage) {
    try {
        const setObj = {};
        const pushObj = {};

        if (typeof updates === 'number') {
            setObj.progress = updates;
            if (stage) setObj.stage = stage;
            if (logMessage) {
                const timestamp = new Date().toISOString();
                pushObj.logs = `[${timestamp}] ${logMessage}`;
                console.log(`[PDF Job ${jobId}] ${logMessage}`);
            }
        } else if (typeof updates === 'object' && updates !== null) {
            for (let key in updates) {
                setObj[key] = updates[key];
            }
            const msg = typeof stage === 'string' ? stage : logMessage;
            if (msg) {
                const timestamp = new Date().toISOString();
                pushObj.logs = `[${timestamp}] ${msg}`;
                console.log(`[PDF Job ${jobId}] ${msg}`);
            }
        }

        const updateObj = {};
        if (Object.keys(setObj).length > 0) updateObj.$set = setObj;
        if (Object.keys(pushObj).length > 0) updateObj.$push = pushObj;
        
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
            uploadProgress: 100,
            ocrProgress: 100,
            aiProgress: 100,
            validationProgress: 100,
            importProgress: 100,
            estimatedTime: '0s',
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
        await updateJob(jobId, {
            progress: 5,
            uploadProgress: 100,
            ocrProgress: 0,
            aiProgress: 0,
            validationProgress: 0,
            importProgress: 0,
            estimatedTime: 'Estimating...',
            stage: 'Loading PDF'
        }, 'Received PDF buffer. Starting text extraction...');
        
        const questions = await parsePDF(
            pdfBuffer, 
            { category: 'Daily Challenge', subject: examType || 'General' }, 
            expectedCount, 
            async (progress, stage, log) => {
                let ocrProgress = 0;
                let aiProgress = 0;

                if (progress <= 10) {
                    ocrProgress = 0;
                } else if (progress > 10 && progress <= 50) {
                    ocrProgress = Math.round((progress - 10) / 40 * 100);
                } else {
                    ocrProgress = 100;
                }

                if (progress <= 50) {
                    aiProgress = 0;
                } else if (progress > 50 && progress <= 85) {
                    aiProgress = Math.round((progress - 50) / 35 * 100);
                } else {
                    aiProgress = 100;
                }

                const elapsed = Date.now() - startTime;
                const eta = progress > 5 ? `${Math.round(((elapsed / progress) * (100 - progress)) / 1000)}s` : 'Estimating...';

                await updateJob(jobId, {
                    progress,
                    ocrProgress,
                    aiProgress,
                    estimatedTime: eta,
                    stage
                }, log);
            }
        );

        if (!questions || questions.length === 0) {
            throw new Error('No MCQ questions detected. Format your PDF with standard MCQ numbering and option blocks (A, B, C, D).');
        }

        // Batch upload parser logs
        const parserLogs = questions.parserLogs || [];
        if (parserLogs.length > 0) {
            const timestamp = new Date().toISOString();
            const formattedLogs = parserLogs.map(l => `[${timestamp}] ${l}`);
            await PdfJob.updateOne(
                { jobId },
                { $push: { logs: { $each: formattedLogs } } }
            );
        }

        const warningCount = questions.stats ? questions.stats.warning : 0;
        const errorsCount = questions.stats ? (questions.stats.encodingErrors + questions.stats.missingOptions + questions.stats.missingAnswers) : 0;

        await PdfJob.updateOne(
            { jobId },
            {
                $set: {
                    warningsCount,
                    errorsCount,
                    validationErrors: questions.validationErrors || [],
                    validationProgress: 100,
                    importProgress: 100
                }
            }
        );

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
