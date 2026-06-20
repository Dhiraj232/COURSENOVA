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
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const qRegexWithQ = /^(?:Q\s*[.]?\s*(\d+)\s*[.)]?\s*)(.*)/i;
    const qRegexWithoutQ = /^(?:Q?\s*(\d+)\s*[.)]\s*)(.*)/i;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const qMatch = line.match(qRegexWithQ) || line.match(qRegexWithoutQ);
        if (qMatch) {
            const firstQuestionLine = qMatch[2].trim();
            const questionLines = [firstQuestionLine];
            const parsedOptions = ['', '', '', ''];
            let correctIndex = -1;
            let correctIndexFallback = -1;
            let correctIndexAnswerLine = -1;
            let optionsStarted = false;
            
            let j = i + 1;
            while (j < lines.length && j < i + 40) {
                const optLine = lines[j];
                
                // If we hit another question, stop processing this one
                if (optLine.match(qRegexWithQ) || optLine.match(qRegexWithoutQ)) {
                    break;
                }

                // Check for Chosen Option metadata
                const chosenMatch = optLine.match(/Chosen\s*Option\s*:\s*([1-4A-Da-d])/i);
                if (chosenMatch) {
                    let val = chosenMatch[1].toUpperCase();
                    if (val >= 'A' && val <= 'D') {
                        correctIndexFallback = val.charCodeAt(0) - 65;
                    } else {
                        const num = parseInt(val);
                        if (num >= 1 && num <= 4) {
                            correctIndexFallback = num - 1;
                        }
                    }
                    j++;
                    continue;
                }

                // Check for explicit Answer/Correct line
                const ansLineMatch = optLine.match(/^(?:ans(?:wer)?|correct\s*(?:answer)?|key)\s*[:\-.]?\s*([1-4A-Da-d]|\([1-4A-Da-d]\))/i);
                if (ansLineMatch) {
                    let val = ansLineMatch[1].replace(/[()]/g, '').toUpperCase();
                    if (val >= 'A' && val <= 'D') {
                        correctIndexAnswerLine = val.charCodeAt(0) - 65;
                    } else {
                        const num = parseInt(val);
                        if (num >= 1 && num <= 4) {
                            correctIndexAnswerLine = num - 1;
                        }
                    }
                    j++;
                    continue;
                }

                // Check for ignore patterns
                if (/^Question ID\s*:/i.test(optLine) ||
                    /^Option\s*\d+\s*ID\s*:/i.test(optLine) ||
                    /^Status\s*:/i.test(optLine) ||
                    /^https?:\/\/link\.testbook\.com/i.test(optLine) ||
                    /^Page\s*\d+/i.test(optLine) ||
                    /^testbook/i.test(optLine) ||
                    optLine.toLowerCase() === 'testbook') {
                    j++;
                    continue;
                }

                // Match inline options 1-4 or A-D
                const isInline1to4 = /1\s*[.)]\s*.+2\s*[.)]\s*.+3\s*[.)]\s*.+4\s*[.)]/i.test(optLine);
                const isInlineAtoD = /A\s*[.)]\s*.+B\s*[.)]\s*.+C\s*[.)]\s*.+D\s*[.)]/i.test(optLine);

                if (isInline1to4) {
                    optionsStarted = true;
                    const optMatches = [...optLine.matchAll(/(?:\()?([1-4])\s*(?:\)|[.)]\s*)(.+?)(?=\s+(?:\()?([1-4])\s*(?:\)|[.)]\s*)|$)/gi)];
                    for (const match of optMatches) {
                        const idx = parseInt(match[1]) - 1;
                        if (idx >= 0 && idx < 4) {
                            parsedOptions[idx] = match[2].trim();
                            const matchIndex = match.index;
                            const prefix = optLine.substring(Math.max(0, matchIndex - 5), matchIndex);
                            if (/[✔✓✅]/.test(prefix)) {
                                correctIndex = idx;
                            }
                        }
                    }
                } else if (isInlineAtoD) {
                    optionsStarted = true;
                    const optMatches = [...optLine.matchAll(/(?:\()?([A-D])\s*(?:\)|[.)]\s*)(.+?)(?=\s+(?:\()?([A-D])\s*(?:\)|[.)]\s*)|$)/gi)];
                    for (const match of optMatches) {
                        const idx = match[1].toUpperCase().charCodeAt(0) - 65;
                        if (idx >= 0 && idx < 4) {
                            parsedOptions[idx] = match[2].trim();
                            const matchIndex = match.index;
                            const prefix = optLine.substring(Math.max(0, matchIndex - 5), matchIndex);
                            if (/[✔✓✅]/.test(prefix)) {
                                correctIndex = idx;
                            }
                        }
                    }
                } else {
                    // Match single option 1-4 or A-D
                    const match1to4 = optLine.match(/^(?:Ans\s*)?(?:[✔✓✗\s]*|[Xx\s]*)\b([1-4])\s*[.)]\s*(.+)/i);
                    const matchAtoD = optLine.match(/^(?:Ans\s*)?(?:[✔✓✗\s]*|[Xx\s]*)\b([A-D])\s*[.)]\s*(.+)/i);

                    if (match1to4) {
                        optionsStarted = true;
                        const idx = parseInt(match1to4[1]) - 1;
                        if (idx >= 0 && idx < 4) {
                            parsedOptions[idx] = match1to4[2].trim();
                            const prefix = optLine.substring(0, optLine.indexOf(match1to4[1]));
                            if (/[✔✓✅]/.test(prefix)) {
                                correctIndex = idx;
                            }
                        }
                    } else if (matchAtoD) {
                        optionsStarted = true;
                        const idx = matchAtoD[1].toUpperCase().charCodeAt(0) - 65;
                        if (idx >= 0 && idx < 4) {
                            parsedOptions[idx] = matchAtoD[2].trim();
                            const prefix = optLine.substring(0, optLine.indexOf(matchAtoD[1]));
                            if (/[✔✓✅]/.test(prefix)) {
                                correctIndex = idx;
                            }
                        }
                    } else {
                        // If option parsing hasn't started, it's question text
                        if (!optionsStarted) {
                            if (!optLine.match(/^(?:Ans\s*)?(?:[✔✓✗\s]*|[Xx\s]*)\b[1-4A-D]\s*[.)]/i)) {
                                questionLines.push(optLine);
                            }
                        }
                    }
                }
                j++;
            }

            const validOptionsCount = parsedOptions.filter(Boolean).length;
            if (validOptionsCount >= 2) {
                for (let k = 0; k < 4; k++) {
                    if (!parsedOptions[k]) parsedOptions[k] = '—';
                }

                let finalCorrectIdx = 0;
                if (correctIndex >= 0 && correctIndex < 4) {
                    finalCorrectIdx = correctIndex;
                } else if (correctIndexAnswerLine >= 0 && correctIndexAnswerLine < 4) {
                    finalCorrectIdx = correctIndexAnswerLine;
                } else if (correctIndexFallback >= 0 && correctIndexFallback < 4) {
                    finalCorrectIdx = correctIndexFallback;
                }

                let englishLines = [];
                let hindiLines = [];
                let hasSeenHindi = false;

                for (const qLine of questionLines) {
                    const hasHindi = /[\u0900-\u097F]/.test(qLine);
                    if (hasHindi) {
                        hasSeenHindi = true;
                        hindiLines.push(qLine);
                    } else {
                        if (hasSeenHindi) {
                            hindiLines.push(qLine);
                        } else {
                            englishLines.push(qLine);
                        }
                    }
                }

                const questionEn = englishLines.join('\n').trim();
                const questionHi = hindiLines.join('\n').trim();

                const finalOptions = parsedOptions;
                const finalCorrectAnswerText = finalOptions[finalCorrectIdx] || finalOptions[0] || '';

                questions.push({
                    question: questionEn || questionHi,
                    question_hi: questionHi || questionEn,
                    options: finalOptions,
                    options_hi: finalOptions,
                    correctAnswer: finalCorrectAnswerText,
                    explanation: 'Extracted from PDF'
                });
                i = j;
                continue;
            }
        }
        i++;
    }
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
