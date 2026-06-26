const fs = require('fs');
const path = require('path');
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
    text = text.replace(/\t\s\t|\t\s+|\s+\t|\t{2,}/g, ' ').replace(/\t/g, '');

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
        const ansMatch = line.match(/^(?:ans(?:wer)?|correct\s*(?:answer)?|key|उत्तर)\s*[:\-.]?\s*(\(?[1-4A-Da-d]\)?)/i);
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
            console.log(`Detected Section/Subject: "${line}" -> Mapped to: "${currentSubject}"`);
            continue;
        }

        const qStart = matchQuestionStart(line);
        if (qStart) {
            if (currentQ) {
                const validOptionsCount = currentQ.options.filter(Boolean).length;
                if (validOptionsCount >= 2) {
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
        const validOptionsCount = currentQ.options.filter(Boolean).length;
        if (validOptionsCount >= 2) {
            questions.push(currentQ);
        }
    }

    const parsedQuestions = questions.map(q => {
        const finalOptions = q.options.map((opt, idx) => opt || `Option ${idx + 1}`);
        const fullQText = q.questionLines.join('\n').trim();
        
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
            qNum: q.qNum,
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

async function run() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD Constable Shift 1 English.pdf';
    console.log(`Reading PDF from: ${pdfPath}`);
    if (!fs.existsSync(pdfPath)) {
        console.error('PDF file does not exist.');
        return;
    }
    const buffer = fs.readFileSync(pdfPath);
    console.log(`File read successfully. Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Parsing PDF text...`);
    
    const startTime = Date.now();
    const result = await pdfParse(buffer);
    console.log(`PDF parse completed in ${((Date.now() - startTime)/1000).toFixed(2)}s. Extracted text length: ${result.text.length} characters.`);
    
    // Dump text to file
    fs.writeFileSync('scratch/extracted_text.txt', result.text);
    console.log('Wrote extracted text to scratch/extracted_text.txt');
    console.log('\n--- FIRST 2000 CHARACTERS ---');
    console.log(result.text.substring(0, 2000));
    console.log('--- END FIRST 2000 CHARACTERS ---\n');

    console.log('Parsing questions using local parser...');
    const questions = parseMCQFromText(result.text);
    console.log(`Parsed ${questions.length} questions.`);
    console.log(`isEmptyPDF flag: ${questions.isEmptyPDF}`);
    
    if (questions.length > 0) {
        console.log('\n--- FIRST 2 QUESTIONS ---');
        console.log(JSON.stringify(questions.slice(0, 2), null, 2));
        
        console.log('\n--- LAST 2 QUESTIONS ---');
        console.log(JSON.stringify(questions.slice(-2), null, 2));
    }
}

run().catch(console.error);
