require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');
const MockTestPack = require('../models/MockTestPack');
const pdfParseModule = require('pdf-parse');

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

function parseMCQFromText(text) {
    text = text.replace(/\t\s\t|\t\s+|\s+\t|\t{2,}/g, ' ').replace(/\t/g, ' ');
    const rawLines = text.split('\n');
    let spacedOutLines = 0;
    let validLines = 0;
    for (let line of rawLines) {
        const trimmed = line.trim();
        if (trimmed.length < 10) continue;
        validLines++;
        const words = trimmed.split(/\s+/);
        const singleChars = words.filter(w => w.length === 1 && /[a-zA-Z0-9]/.test(w)).length;
        if (singleChars / words.length > 0.5) spacedOutLines++;
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
                if (/[✔✓✅☑]/.test(line.substring(Math.max(0, currentMatch.index - 5), currentMatch.index + currentMatch.length))) {
                    correctIndexRef.val = currentIdx;
                }
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
        ) continue;

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
                if (currentQ.options.filter(Boolean).length >= (useQPrefix ? 0 : 2)) questions.push(currentQ);
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
            if (parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef, currentQ.optionsStarted)) {
                currentQ.optionsStarted = true;
                continue;
            }
            if (!currentQ.optionsStarted) currentQ.questionLines.push(line);
        }
    }
    if (currentQ && currentQ.options.filter(Boolean).length >= (useQPrefix ? 0 : 2)) questions.push(currentQ);

    return questions.map(q => {
        const finalOptions = q.options.map((opt, idx) => opt || `Option ${idx + 1}`);
        let englishLines = [];
        let hindiLines = [];
        let hasSeenHindi = false;
        q.questionLines.forEach(line => {
            if (/[\u0900-\u097F]/.test(line)) {
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
        return {
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
        };
    });
}

function cleanText(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD Constable Shift 1 English.pdf';
        console.log(`Reading PDF from: ${pdfPath}`);
        const buffer = fs.readFileSync(pdfPath);
        const result = await pdfParse(buffer);
        const text = result.text || '';

        console.log('Parsing questions...');
        const parsed = parseMCQFromText(text);
        console.log(`Total questions parsed from PDF: ${parsed.length}`);

        const questionTexts = parsed.map(q => q.question).filter(Boolean);
        const questionEnTexts = parsed.map(q => q.question_en).filter(Boolean);

        console.log('Fetching duplicates...');
        const existing = await PracticeQuestion.find({
            $or: [
                { question: { $in: questionTexts } },
                { question_en: { $in: questionEnTexts } }
            ]
        });

        const existingMap = new Map();
        existing.forEach(q => {
            if (q.question) existingMap.set(cleanText(q.question), q);
            if (q.question_en) existingMap.set(cleanText(q.question_en), q);
        });

        const finalQuestionIds = [];
        const uniqueToInsert = [];

        for (let i = 0; i < parsed.length; i++) {
            const q = parsed[i];
            const cleanQ = cleanText(q.question);
            const cleanQEn = cleanText(q.question_en);

            const found = existingMap.get(cleanQ) || (cleanQEn ? existingMap.get(cleanQEn) : null);
            if (found) {
                finalQuestionIds.push({ index: i, id: found._id });
            } else {
                uniqueToInsert.push({ q, index: i });
            }
        }

        console.log(`Duplicates to skip: ${parsed.length - uniqueToInsert.length}`);
        console.log(`Unique questions to insert: ${uniqueToInsert.length}`);

        if (uniqueToInsert.length > 0) {
            const docsToInsert = uniqueToInsert.map(u => ({
                question: u.q.question,
                question_en: u.q.question_en,
                question_hi: u.q.question_hi,
                options: u.q.options,
                options_en: u.q.options_en,
                options_hi: u.q.options_hi,
                correctAnswer: u.q.correctAnswer,
                explanation: 'Detailed solution.',
                explanation_hi: 'विस्तृत हल।',
                category: 'SSC GD Mock Test Series',
                subject: qSubject = mapSubject(u.q.subject || 'General'),
                topic: 'Mock Test Section',
                difficulty: 'Medium',
                isMockTestOnly: true
            }));

            const inserted = await PracticeQuestion.insertMany(docsToInsert);
            inserted.forEach((insertedDoc, idx) => {
                finalQuestionIds.push({ index: uniqueToInsert[idx].index, id: insertedDoc._id });
            });
        }

        finalQuestionIds.sort((a, b) => a.index - b.index);
        const orderedIds = finalQuestionIds.map(f => f.id);

        console.log(`Total ordered question IDs: ${orderedIds.length}`);

        console.log('Finding target Mock Test Pack (ssc-gd-free)...');
        const pack = await MockTestPack.findOne({ id: 'ssc-gd-free' });
        if (!pack) {
            throw new Error('MockTestPack ssc-gd-free not found!');
        }

        const testIndex = pack.tests.findIndex(t => t.testId === 'ssc-gd-free-s3');
        if (testIndex === -1) {
            throw new Error('Test ssc-gd-free-s3 not found in mock test pack!');
        }

        console.log(`Linking ${orderedIds.length} questions to Set 3 Full Test (ssc-gd-free-s3)...`);
        pack.tests[testIndex].questions = orderedIds;
        pack.tests[testIndex].numQuestions = orderedIds.length;
        
        await pack.save();
        console.log('Successfully saved MockTestPack!');

        // Check Set 3 details
        const updatedPack = await MockTestPack.findOne({ id: 'ssc-gd-free' }).populate('tests.questions');
        const set3 = updatedPack.tests.find(t => t.testId === 'ssc-gd-free-s3');
        console.log(`Verification: linked questions count in DB for Set 3 is ${set3.questions.length}`);
        
        process.exit(0);
    } catch (e) {
        console.error('Error linking:', e);
        process.exit(1);
    }
}

run();
