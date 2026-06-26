require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const pdfParseModule = require('pdf-parse');

const PracticeQuestion = require('../models/PracticeQuestion');
const MockTestPack = require('../models/MockTestPack');
const AuditLog = require('../models/AuditLog');

const pdfParse = typeof pdfParseModule === 'function' 
    ? (buffer, options) => pdfParseModule(buffer, options)
    : async function(buffer, options) {
        const { PDFParse } = pdfParseModule;
        if (PDFParse) {
            const parser = new PDFParse({ verbosity: 0, data: buffer });
            const result = await parser.getText(options);
            return { text: result.text || '' };
        }
        throw new Error('pdf-parse module is not a function');
    };

function mapSubject(subjectName) {
    if (!subjectName) return 'General';
    const lower = subjectName.toLowerCase();
    if (lower.includes('reasoning') || lower.includes('intelligence')) return 'Reasoning';
    if (lower.includes('math') || lower.includes('quantitative') || lower.includes('aptitude') || lower.includes('numerical')) return 'Quantitative Aptitude';
    if (lower.includes('general awareness') || lower.includes('knowledge') || lower.includes('science') || lower.includes('awareness') || lower.includes('gk')) return 'General Awareness';
    if (lower.includes('english')) return 'English';
    if (lower.includes('hindi')) return 'Hindi';
    return subjectName.replace(/\b\w/g, c => c.toUpperCase());
}

async function parseMCQFromText(text) {
    text = text.replace(/\t\s\t|\t\s+|\s+\t|\t{2,}/g, ' ').replace(/\t/g, ' ');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions = [];
    const qWithQCount = lines.filter(line => line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*\d+)/i)).length;
    const useQPrefix = qWithQCount > 5;

    function matchQuestionStart(line) {
        if (useQPrefix) {
            const match = line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*(\d+))\s*(.*)/i);
            if (match) return { qNum: parseInt(match[1]), rest: match[2].trim() };
            return null;
        } else {
            let match = line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*(\d+)|(?:\[|\()?(\d+)(?:\]|\))|(\d+)\s*[-.:])\s*(.*)/i);
            if (match) {
                const qNum = match[1] || match[2] || match[3];
                return { qNum: parseInt(qNum), rest: match[4].trim() };
            }
            match = line.match(/^(\d{1,3})\s+([a-zA-Z\u0900-\u097F].*)/);
            if (match) return { qNum: parseInt(match[1]), rest: match[2].trim() };
            return null;
        }
    }

    function parseOptionsFromLine(line, optionsArray, correctIndexRef, optionsStarted) {
        if (!optionsStarted && !/ans|✔|✓|✅|☑/i.test(line)) return false;
        const headerRegex = /(?:^|[\s✔✓✅☑(\[{-])(?:\(|\[)?([A-D1-4])(?:\)|\]|\.)(?:\s|$)/gi;
        const matches = [];
        let match;
        while ((match = headerRegex.exec(line)) !== null) {
            matches.push({ key: match[1].toUpperCase(), index: match.index, length: match[0].length });
        }
        const matchesAtoD = matches.filter(m => m.key >= 'A' && m.key <= 'D');
        const matches1to4 = matches.filter(m => m.key >= '1' && m.key <= '4');

        function parseInline(secMatches, isNumeric) {
            if (secMatches.length < 2) return false;
            const filteredMatches = [];
            let lastIdx = -1;
            for (let i = 0; i < secMatches.length; i++) {
                const m = secMatches[i];
                const idx = isNumeric ? parseInt(m.key) - 1 : m.key.charCodeAt(0) - 65;
                if (idx > lastIdx) {
                    filteredMatches.push(m);
                    lastIdx = idx;
                }
            }
            if (filteredMatches.length < 2) return false;
            for (let i = 0; i < filteredMatches.length; i++) {
                const currentMatch = filteredMatches[i];
                const currentIdx = isNumeric ? parseInt(currentMatch.key) - 1 : currentMatch.key.charCodeAt(0) - 65;
                const startTextIdx = currentMatch.index + currentMatch.length;
                const endTextIdx = (i + 1 < filteredMatches.length) ? filteredMatches[i + 1].index : line.length;
                optionsArray[currentIdx] = line.substring(startTextIdx, endTextIdx).trim();
                const checkArea = line.substring(Math.max(0, currentMatch.index - 5), currentMatch.index + currentMatch.length);
                if (/[✔✓✅☑]/.test(checkArea)) correctIndexRef.val = currentIdx;
            }
            return true;
        }

        if (parseInline(matchesAtoD, false)) return true;
        if (parseInline(matches1to4, true)) return true;

        const singleMatch = line.match(/^(?:Ans\s*)?([^a-zA-Z0-9]*(?:[xX][^a-zA-Z0-9]*)?)\b([A-D1-4])(?:\)|\]|\.|\s)\s*(.*)/i);
        if (singleMatch) {
            const prefix = singleMatch[1];
            const key = singleMatch[2].toUpperCase();
            const text = singleMatch[3].trim();
            const isNumeric = key >= '1' && key <= '4';
            const idx = isNumeric ? parseInt(key) - 1 : key.charCodeAt(0) - 65;
            optionsArray[idx] = text;
            if (/[✔✓✅☑]/.test(prefix) || /[✔✓✅☑]/.test(line.substring(0, Math.min(line.length, 10)))) {
                correctIndexRef.val = idx;
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
        const ansMatch = line.match(/^(?:ans(?:wer)?|correct\s*(?:answer)?|key|उत्तर)\s*[:\-.]?\s*(\(?[1-4A-Da-d]\)?)\.?$/i);
        if (ansMatch) {
            const val = ansMatch[1].replace(/[()]/g, '').toUpperCase();
            return (val >= 'A' && val <= 'D') ? (val.charCodeAt(0) - 65) : (parseInt(val) - 1);
        }
        return null;
    }

    let currentQ = null;
    let currentSection = 'General';
    let currentSubject = 'General';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^Question ID\s*:/i.test(line) ||
            /^Option\s*\d+\s*ID\s*:/i.test(line) ||
            /^Status\s*:/i.test(line) ||
            /^https?:\/\/link\.testbook\.com/i.test(line) ||
            /^Page\s*\d+/i.test(line) ||
            /^testbook/i.test(line) ||
            line.toLowerCase() === 'testbook' ||
            /^(?:ans|ans\.|ans:)$/i.test(line.trim()) ||
            /^(?:--\s*)?\d+\s*(?:of|\/)\s*\d+(?:\s*--)?$/i.test(line.trim())
        ) {
            continue;
        }

        const secMatch = line.match(/^(?:Section|Subject)\s*[:\-]\s*(.*)/i);
        if (secMatch) {
            const rawSec = secMatch[1].trim();
            currentSection = rawSec;
            currentSubject = mapSubject(rawSec);
            continue;
        }

        const qStart = matchQuestionStart(line);
        if (qStart) {
            if (currentQ) {
                const minOptions = useQPrefix ? 0 : 2;
                if (currentQ.options.filter(Boolean).length >= minOptions) {
                    questions.push(currentQ);
                }
            }
            currentQ = {
                qNum: qStart.qNum,
                questionLines: qStart.rest ? [qStart.rest] : [],
                options: ['', '', '', ''],
                correctIndexRef: { val: -1 },
                optionsStarted: false,
                section: currentSection,
                subject: currentSubject
            };
            continue;
        }

        if (currentQ) {
            const ansIdx = parseAnswerFromLine(line);
            if (ansIdx !== null) {
                currentQ.correctIndexRef.val = ansIdx;
                continue;
            }
            const isOpt = parseOptionsFromLine(line, currentQ.options, { val: -1 }, currentQ.optionsStarted);
            if (isOpt) {
                currentQ.optionsStarted = true;
                continue;
            }
            const isOptParsed = parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef, currentQ.optionsStarted);
            if (isOptParsed) {
                currentQ.optionsStarted = true;
                continue;
            }
            if (!currentQ.optionsStarted) {
                currentQ.questionLines.push(line);
            }
        }
    }

    if (currentQ) {
        const minOptions = useQPrefix ? 0 : 2;
        if (currentQ.options.filter(Boolean).length >= minOptions) {
            questions.push(currentQ);
        }
    }

    const parsedQuestions = [];
    for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
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
                if (hasSeenHindi) hindiLines.push(line);
                else englishLines.push(line);
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

        parsedQuestions.push({
            question: questionEn || questionHi,
            question_en: questionEn,
            question_hi: questionHi || questionEn,
            options: finalOptions,
            options_en: finalOptions,
            options_hi: finalOptions,
            correctAnswer: finalOptions[correctIdx] || '',
            correctIndex: correctIdx,
            section: q.section,
            subject: q.subject
        });
    }

    return parsedQuestions;
}

async function runTest() {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD Constable Shift 1 English.pdf';
    
    // --- STAGE 1 ---
    const t1 = Date.now();
    console.log('[1] Upload started');
    
    // --- STAGE 2 ---
    const t2 = Date.now();
    const buffer = fs.readFileSync(pdfPath);
    console.log(`[2] PDF received (size: ${buffer.length} bytes) - elapsed: ${t2 - t1}ms`);

    // --- STAGE 3 ---
    let text = '';
    try {
        const result = await pdfParse(buffer);
        text = result.text || '';
    } catch (e) {
        console.error('Error during pdf-parse:', e);
    }
    const t3 = Date.now();
    console.log(`[3] Text extraction completed (length: ${text.length} chars) - elapsed: ${t3 - t2}ms`);

    // --- STAGE 4 & 5 (OCR) ---
    const t4 = Date.now();
    const isScanned = text.trim().length < 100;
    if (isScanned) {
        console.log(`[4] OCR started (if used) - elapsed: 0ms`);
        // We skip OCR for this test because it is a text selectable PDF
        console.log(`[5] OCR completed - elapsed: 0ms`);
    } else {
        console.log(`[4] OCR started (if used) - SKIPPED`);
        console.log(`[5] OCR completed - SKIPPED`);
    }
    const t5 = Date.now();

    // --- STAGE 6 ---
    const parsedQuestions = await parseMCQFromText(text);
    const t6 = Date.now();
    console.log(`[6] Question parsing completed - elapsed: ${t6 - t5}ms`);

    // --- STAGE 7 ---
    console.log(`[7] Total questions detected: ${parsedQuestions.length} - elapsed: ${Date.now() - t6}ms`);
    const t7 = Date.now();

    // --- STAGE 8 ---
    const questionTexts = parsedQuestions.map(q => q.question).filter(Boolean);
    const questionEnTexts = parsedQuestions.map(q => q.question_en).filter(Boolean);

    const existingQuestions = await PracticeQuestion.find({
        $or: [
            { question: { $in: questionTexts } },
            { question_en: { $in: questionEnTexts } }
        ]
    });

    function cleanText(text) {
        if (!text) return '';
        return text.trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
    }

    const existingMap = new Map();
    existingQuestions.forEach(q => {
        if (q.question) existingMap.set(cleanText(q.question), q);
        if (q.question_en) existingMap.set(cleanText(q.question_en), q);
    });

    const uniqueQuestions = [];
    const questionIdMapping = [];
    let duplicateCount = 0;
    let failedCount = 0;

    parsedQuestions.forEach((q, idx) => {
        if (!q.question || !q.options || q.options.length < 4 || !q.correctAnswer) {
            failedCount++;
            return;
        }

        const formattedQ = {
            question: q.question,
            question_en: q.question_en || q.question,
            question_hi: q.question_hi || q.question,
            options: q.options,
            options_en: q.options_en || q.options,
            options_hi: q.options_hi || q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            category: 'SSC GD',
            subject: mapSubject(q.subject || 'General'),
            topic: q.topic || '',
            difficulty: 'Medium',
            isMockTestOnly: true
        };

        const cleanQ = cleanText(formattedQ.question);
        const cleanQEn = cleanText(formattedQ.question_en);

        const existing = existingMap.get(cleanQ) || (cleanQEn ? existingMap.get(cleanQEn) : null);
        if (existing) {
            duplicateCount++;
            questionIdMapping.push({ index: idx, id: existing._id });
        } else {
            uniqueQuestions.push({ formattedQ, index: idx });
        }
    });

    const t8 = Date.now();
    console.log(`[8] Duplicate detection completed (found ${duplicateCount} duplicates, ${uniqueQuestions.length} unique) - elapsed: ${t8 - t7}ms`);

    // --- STAGE 9 & 10 ---
    console.log(`[9] MongoDB insert started`);
    const t9 = Date.now();
    let importedCount = 0;
    const batchSize = 200;

    for (let i = 0; i < uniqueQuestions.length; i += batchSize) {
        const batch = uniqueQuestions.slice(i, i + batchSize);
        const batchToInsert = batch.map(b => b.formattedQ);
        try {
            const inserted = await PracticeQuestion.insertMany(batchToInsert, { ordered: false });
            inserted.forEach((insertedQ, bIdx) => {
                const originalIndex = batch[bIdx].index;
                questionIdMapping.push({ index: originalIndex, id: insertedQ._id });
                importedCount++;
            });
        } catch (insertErr) {
            for (let bIdx = 0; bIdx < batch.length; bIdx++) {
                const item = batch[bIdx];
                try {
                    const singleQ = await PracticeQuestion.create(item.formattedQ);
                    questionIdMapping.push({ index: item.index, id: singleQ._id });
                    importedCount++;
                } catch (singleErr) {
                    failedCount++;
                }
            }
        }
    }
    const t10 = Date.now();
    console.log(`[10] MongoDB insert completed (inserted: ${importedCount}) - elapsed: ${t10 - t9}ms`);

    // --- STAGE 11 & 12 ---
    console.log(`[11] Mock Test linking started`);
    const t11 = Date.now();
    
    // Find a test pack to link
    const pack = await MockTestPack.findOne();
    if (pack && pack.tests && pack.tests.length > 0) {
        const test = pack.tests[0];
        const finalQuestionIds = questionIdMapping.sort((a, b) => a.index - b.index).map(m => m.id);
        test.questions = finalQuestionIds;
        test.numQuestions = finalQuestionIds.length;
        await pack.save();
        console.log(`Linked to pack: ${pack.title}, test: ${test.testTitle}`);
    } else {
        console.log('No mock test pack found to link. Skipping mock test save.');
    }
    const t12 = Date.now();
    console.log(`[12] Mock Test linking completed - elapsed: ${t12 - t11}ms`);

    // --- STAGE 13 ---
    const t13 = Date.now();
    console.log(`[13] Response sent - elapsed: ${t13 - t12}ms`);
    console.log(`\n=== Total processing time: ${t13 - t1}ms ===\n`);

    await mongoose.disconnect();
}

runTest().catch(console.error);
