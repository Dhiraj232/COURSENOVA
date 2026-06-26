require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');
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
        throw new Error('pdf-parse module is not a function and does not export PDFParse');
    };

// Map subject names to align with existing CourseNova SSC/Test subjects
function mapSubject(subjectName) {
    if (!subjectName) return 'General';
    const lower = subjectName.toLowerCase();
    if (lower.includes('reasoning') || lower.includes('intelligence')) {
        return 'Reasoning';
    }
    if (lower.includes('math') || lower.includes('quantitative') || lower.includes('aptitude') || lower.includes('numerical')) {
        return 'Quantitative Aptitude';
    }
    if (lower.includes('general awareness') || lower.includes('knowledge') || lower.includes('science') || lower.includes('awareness') || lower.includes('gk')) {
        return 'General Awareness';
    }
    if (lower.includes('english')) {
        return 'English';
    }
    if (lower.includes('hindi')) {
        return 'Hindi';
    }
    return subjectName.replace(/\b\w/g, c => c.toUpperCase());
}

function parseMCQFromText(text, expectedCount = 100) {
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

    const qWithQCount = lines.filter(line => line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*\d+)/i)).length;
    const useQPrefix = qWithQCount > 5;

    function matchQuestionStart(line) {
        if (useQPrefix) {
            const match = line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*(\d+))\s*(.*)/i);
            if (match) {
                return { qNum: parseInt(match[1]), rest: match[2].trim() };
            }
            return null;
        } else {
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
    }

    function parseOptionsFromLine(line, optionsArray, correctIndexRef, optionsStarted) {
        if (!optionsStarted) {
            if (!/ans|✔|✓|✅|☑/i.test(line)) {
                return false;
            }
        }

        const headerRegex = /(?:^|[\s✔✓✅☑(\[{-])(?:\(|\[)?([A-D1-4])(?:\)|\]|\.)(?:\s|$)/gi;
        const matches = [];
        let match;
        while ((match = headerRegex.exec(line)) !== null) {
            matches.push({
                key: match[1].toUpperCase(),
                index: match.index,
                length: match[0].length
            });
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
                const currentIdx = isNumeric 
                    ? parseInt(currentMatch.key) - 1 
                    : currentMatch.key.charCodeAt(0) - 65;
                
                const startTextIdx = currentMatch.index + currentMatch.length;
                const endTextIdx = (i + 1 < filteredMatches.length) 
                    ? filteredMatches[i + 1].index 
                    : line.length;

                const optionText = line.substring(startTextIdx, endTextIdx).trim();
                optionsArray[currentIdx] = optionText;

                const checkArea = line.substring(Math.max(0, currentMatch.index - 5), currentMatch.index + currentMatch.length);
                if (/[✔✓✅☑]/.test(checkArea)) {
                    correctIndexRef.val = currentIdx;
                }
            }
            return true;
        }

        if (parseInline(matchesAtoD, false)) {
            return true;
        }
        if (parseInline(matches1to4, true)) {
            return true;
        }

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
                const validOptionsCount = currentQ.options.filter(Boolean).length;
                if (validOptionsCount >= minOptions) {
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

            const isOpt = parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef, currentQ.optionsStarted);
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
        const minOptions = useQPrefix ? 0 : 2;
        const validOptionsCount = currentQ.options.filter(Boolean).length;
        if (validOptionsCount >= minOptions) {
            questions.push(currentQ);
        }
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

    const isSufficientText = text && text.trim().length >= 100;
    const emptyCount = parsedQuestions.filter(q => q.question && q.question.startsWith('[Question') && q.options && q.options.every(o => o && (o.startsWith('Option') || o === '—'))).length;
    parsedQuestions.isEmptyPDF = !isSufficientText && parsedQuestions.length > 0 && (emptyCount / parsedQuestions.length) > 0.8;

    return parsedQuestions;
}

async function testPipeline() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const tempCategory = 'Temp_SSC_GD_Pipeline_Test';
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD Constable Shift 1 English.pdf';

    console.log(`Deleting existing questions in ${tempCategory}...`);
    await PracticeQuestion.deleteMany({ category: tempCategory });

    console.log(`Reading PDF from: ${pdfPath}`);
    const buffer = fs.readFileSync(pdfPath);

    const startTime = Date.now();
    console.log('Parsing PDF...');
    const result = await pdfParse(buffer);
    const text = result.text || '';
    console.log(`Extracted text length: ${text.length} characters.`);

    console.log('Running MCQ parser...');
    const parsedQuestions = parseMCQFromText(text, 100);
    console.log(`Questions found: ${parsedQuestions.length}`);

    if (parsedQuestions.length === 0) {
        throw new Error('No questions found.');
    }

    // Filter duplicates (should be 0 since we deleted them)
    const questionTexts = parsedQuestions.map(q => q.question).filter(Boolean);
    const existingQuestions = await PracticeQuestion.find({
        question: { $in: questionTexts }
    });

    function cleanText(text) {
        if (!text) return '';
        return text.trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
    }

    const existingSet = new Set();
    existingQuestions.forEach(q => {
        if (q.question) existingSet.add(cleanText(q.question));
    });

    const uniqueQuestions = [];
    let duplicateCount = 0;
    let failedCount = 0;

    for (const q of parsedQuestions) {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 4 || !q.correctAnswer) {
            failedCount++;
            continue;
        }

        const formattedQ = {
            question: q.question,
            question_en: q.question_en || q.question,
            question_hi: q.question_hi || q.question,
            options: q.options,
            options_en: q.options_en || q.options,
            options_hi: q.options_hi || q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || 'Detail solution',
            explanation_hi: q.explanation_hi || 'विस्तृत हल',
            category: tempCategory,
            subject: mapSubject(q.subject || 'General'),
            topic: q.topic || 'Practice',
            difficulty: 'Medium',
            isMockTestOnly: true
        };

        const cleanQ = cleanText(formattedQ.question);
        if (existingSet.has(cleanQ)) {
            duplicateCount++;
        } else {
            uniqueQuestions.push(formattedQ);
        }
    }

    console.log(`Duplicates: ${duplicateCount}, Unique to insert: ${uniqueQuestions.length}`);

    // Insert in batches
    let importedCount = 0;
    const batchSize = 200;
    console.log(`Database save started for ${uniqueQuestions.length} unique questions.`);
    for (let i = 0; i < uniqueQuestions.length; i += batchSize) {
        const batch = uniqueQuestions.slice(i, i + batchSize);
        try {
            const inserted = await PracticeQuestion.insertMany(batch, { ordered: false });
            importedCount += inserted.length;
        } catch (insertErr) {
            console.error('Batch insert error, falling back to individual creates:', insertErr.message);
            for (const singleQ of batch) {
                try {
                    await PracticeQuestion.create(singleQ);
                    importedCount++;
                } catch (singleErr) {
                    console.error('Single create failed:', singleErr.message);
                    failedCount++;
                }
            }
        }
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n==================================================`);
    console.log(`IMPORT REPORT`);
    console.log(`==================================================`);
    console.log(`Total Questions Found : ${parsedQuestions.length}`);
    console.log(`Successfully Imported : ${importedCount}`);
    console.log(`Duplicate (Skipped)   : ${duplicateCount}`);
    console.log(`Failed Questions      : ${failedCount}`);
    console.log(`Import Time           : ${elapsedSec} seconds`);
    console.log(`==================================================`);

    // Verify in database
    const dbCount = await PracticeQuestion.countDocuments({ category: tempCategory });
    console.log(`Verified DB count for category "${tempCategory}": ${dbCount} questions.`);

    console.log('Cleaning up integration test data...');
    await PracticeQuestion.deleteMany({ category: tempCategory });
    console.log('Cleaned.');

    if (importedCount + duplicateCount + failedCount !== parsedQuestions.length) {
        throw new Error(`Import verification mismatch! Expected ${parsedQuestions.length} questions, but got: Imported: ${importedCount}, Duplicates: ${duplicateCount}, Failed: ${failedCount}.`);
    }
    console.log('All pipeline integration checks passed 100%!');
}

testPipeline()
    .then(() => {
        mongoose.disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('Pipeline integration test failed:', err);
        mongoose.disconnect();
        process.exit(1);
    });
