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
function parseQuestionsFromText(text, expectedCount = 100) {
    // ── First: Reconstruct words by replacing cell separators (tabs) ──
    text = text.replace(/\t\s\t|\t\s+|\s+\t|\t{2,}/g, ' ').replace(/\t/g, '');

    // ── Second: Detect and heal spaced out text if letters are still separated by space ──
    const rawLines = text.split('\n');
    let spacedOutLines = 0;
    let validLines = 0;
    for (let line of rawLines) {
        const trimmed = line.trim();
        if (trimmed.length < 10) continue;
        validLines++;
        const words = trimmed.split(/\s+/);
        const singleChars = words.filter(w => w.length === 1 && /[a-zA-Z0-9]/.test(w)).length;
        if (singleChars / words.length > 0.5) {
            spacedOutLines++;
        }
    }
    
    if (validLines > 0 && (spacedOutLines / validLines) > 0.3) {
        text = rawLines.map(line => {
            const trimmed = line.trim();
            return trimmed
                .replace(/\s{2,}/g, ' \u0000 ')
                .replace(/(?<=[a-zA-Z0-9])\s+(?=[a-zA-Z0-9])/g, '')
                .replace(/ \u0000 /g, ' ');
        }).join('\n');
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions = [];

    // Helper functions for matching question/option/answer
    function matchQuestionStart(line) {
        let match = line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*(\d+)|(?:\[|\()?(\d+)(?:\]|\))|(\d+)\s*[-.:])\s*(.*)/i);
        if (match) {
            const qNum = match[1] || match[2] || match[3];
            return { qNum: parseInt(qNum), rest: match[4].trim() };
        }
        match = line.match(/^(\d{1,3})\s+([a-zA-Z\u0900-\u097F].*)/);
        if (match) {
            return { qNum: parseInt(match[1]), rest: match[2].trim() };
        }
        return null;
    }

    function parseOptionsFromLine(line, optionsArray, correctIndexRef) {
        const inlineMatchesAtoD = [...line.matchAll(/(?:\()?([A-D])(?:\)|[.)\]])\s*([^A-D\n]+?)(?=\s+(?:\()?([A-D])(?:\)|[.)\]])|$)/gi)];
        if (inlineMatchesAtoD.length >= 2) {
            inlineMatchesAtoD.forEach(match => {
                const idx = match[1].toUpperCase().charCodeAt(0) - 65;
                if (idx >= 0 && idx < 4) {
                    optionsArray[idx] = match[2].trim();
                    if (/[✔✓✅☑]/.test(line.substring(Math.max(0, match.index - 5), match.index))) {
                        correctIndexRef.val = idx;
                    }
                }
            });
            return true;
        }

        const inlineMatches1to4 = [...line.matchAll(/(?:\()?([1-4])(?:\)|[.)\]])\s*([^1-4\n]+?)(?=\s+(?:\()?([1-4])(?:\)|[.)\]])|$)/gi)];
        if (inlineMatches1to4.length >= 2) {
            inlineMatches1to4.forEach(match => {
                const idx = parseInt(match[1]) - 1;
                if (idx >= 0 && idx < 4) {
                    optionsArray[idx] = match[2].trim();
                    if (/[✔✓✅☑]/.test(line.substring(Math.max(0, match.index - 5), match.index))) {
                        correctIndexRef.val = idx;
                    }
                }
            });
            return true;
        }

        const singleMatchAtoD = line.match(/^(?:Ans\s*)?(?:[^0-9a-zA-Z]*|[Xx\s]*)\b([A-D])(?:\)|[.)\]])\s*(.*)/i);
        if (singleMatchAtoD) {
            const idx = singleMatchAtoD[1].toUpperCase().charCodeAt(0) - 65;
            if (idx >= 0 && idx < 4) {
                optionsArray[idx] = singleMatchAtoD[2].trim();
                const prefix = line.substring(0, line.indexOf(singleMatchAtoD[1]));
                if (/[✔✓✅☑]/.test(prefix)) {
                    correctIndexRef.val = idx;
                }
            }
            return true;
        }

        const singleMatch1to4 = line.match(/^(?:Ans\s*)?(?:[^0-9a-zA-Z]*|[Xx\s]*)\b([1-4])(?:\)|[.)\]])\s*(.*)/i);
        if (singleMatch1to4) {
            const idx = parseInt(singleMatch1to4[1]) - 1;
            if (idx >= 0 && idx < 4) {
                optionsArray[idx] = singleMatch1to4[2].trim();
                const prefix = line.substring(0, line.indexOf(singleMatch1to4[1]));
                if (/[✔✓✅☑]/.test(prefix)) {
                    correctIndexRef.val = idx;
                }
            }
            return true;
        }

        return false;
    }

    function parseAnswerFromLine(line) {
        const chosenMatch = line.match(/Chosen\s*Option\s*:\s*([1-4A-Da-d]|\-\-)/i);
        if (chosenMatch && chosenMatch[1] !== '--') {
            const val = chosenMatch[1].toUpperCase();
            return (val >= 'A' && val <= 'D') ? (val.charCodeAt(0) - 65) : (parseInt(val) - 1);
        }
        const ansMatch = line.match(/^(?:ans(?:wer)?|correct\s*(?:answer)?|key|उत्तर)\s*[:\-.]?\s*(\(?[1-4A-Da-d]\)?)/i);
        if (ansMatch) {
            const val = ansMatch[1].replace(/[()]/g, '').toUpperCase();
            return (val >= 'A' && val <= 'D') ? (val.charCodeAt(0) - 65) : (parseInt(val) - 1);
        }
        return null;
    }

    let currentQ = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^Question ID\s*:/i.test(line) ||
            /^Option\s*\d+\s*ID\s*:/i.test(line) ||
            /^Status\s*:/i.test(line) ||
            /^https?:\/\/link\.testbook\.com/i.test(line) ||
            /^Page\s*\d+/i.test(line) ||
            /^testbook/i.test(line) ||
            line.toLowerCase() === 'testbook' ||
            /^(?:ans|ans\.|ans:)$/i.test(line.trim())
        ) {
            continue;
        }

        const qStart = matchQuestionStart(line);
        if (qStart) {
            if (currentQ) {
                questions.push(currentQ);
            }
            currentQ = {
                qNum: qStart.qNum,
                questionLines: qStart.rest ? [qStart.rest] : [],
                options: ['', '', '', ''],
                correctIndexRef: { val: -1 },
                optionsStarted: false
            };
            continue;
        }

        if (currentQ) {
            const ansIdx = parseAnswerFromLine(line);
            if (ansIdx !== null) {
                currentQ.correctIndexRef.val = ansIdx;
                continue;
            }

            const isOpt = parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef);
            if (isOpt) {
                currentQ.optionsStarted = true;
                continue;
            }

            if (!currentQ.optionsStarted) {
                currentQ.questionLines.push(line);
            }
        }
    }

    if (currentQ) {
        questions.push(currentQ);
    }

    const parsedQuestions = questions.map(q => {
        const finalOptions = q.options.map((opt, idx) => opt || `Option ${idx + 1}`);
        let englishLines = [];
        let hindiLines = [];
        let hasSeenHindi = false;

        q.questionLines.forEach(line => {
            const hasHindi = /[\u0900-\u097F]/.test(line);
            if (hasHindi) {
                hasSeenHindi = true;
                hindiLines.push(line);
            } else {
                if (hasSeenHindi) {
                    hindiLines.push(line);
                } else {
                    englishLines.push(line);
                }
            }
        });

        let questionEn = englishLines.join('\n').trim();
        let questionHi = hindiLines.join('\n').trim();

        if (!questionEn && !questionHi) {
            questionEn = `[Question ${q.qNum}]`;
            questionHi = `[Question ${q.qNum}]`;
        } else if (!questionEn) {
            questionEn = questionHi;
        } else if (!questionHi) {
            questionHi = questionEn;
        }

        const correctIdx = q.correctIndexRef.val >= 0 && q.correctIndexRef.val < 4 ? q.correctIndexRef.val : 0;
        const correctAnswerText = finalOptions[correctIdx] || '';

        return {
            question: questionEn || questionHi,
            question_hi: questionHi || questionEn,
            options: finalOptions,
            options_hi: finalOptions,
            correctAnswer: correctAnswerText,
            explanation: 'Extracted from PDF'
        };
    });

    const emptyCount = parsedQuestions.filter(q => !q.question || q.question.startsWith('[Question') || (q.options && q.options.every(o => !o || o === '—' || o.startsWith('Option')))).length;
    parsedQuestions.isEmptyPDF = parsedQuestions.length > 0 && (emptyCount / parsedQuestions.length) > 0.8;

    return parsedQuestions;
}

// POST /api/admin/daily-challenge/upload
router.post('/upload', requireAuth, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No PDF uploaded' });
        const { date, title, examType } = req.body;
        const pdfBuffer = req.file.buffer;
        
        const data = await pdfParse(pdfBuffer);
        const expectedCount = req.query.expectedCount || req.body.expectedCount || 100;
        const questions = parseQuestionsFromText(data.text, expectedCount);

        if (questions.length === 0) {
            return res.json({
                ok: false,
                error: '❌ No MCQ questions detected. Format your PDF with standard MCQ numbering and option blocks (A, B, C, D).'
            });
        }

        if (questions.isEmptyPDF) {
            return res.json({
                ok: false,
                error: '❌ The uploaded PDF contains scanned images or is not text-selectable. Please upload a text-selectable PDF.'
            });
        }

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
