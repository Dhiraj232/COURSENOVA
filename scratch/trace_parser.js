const fs = require('fs');

const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

// Map subject names to align with existing CourseNova SSC/Test subjects
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

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Count how many lines look like Q.1, Q.2, Q1, Question 1, प्र. 1, प्रश्न 1
    const qWithQCount = lines.filter(line => line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*\d+)/i)).length;
    const useQPrefix = qWithQCount > 5;
    console.log(`Detected useQPrefix: ${useQPrefix} (Q-prefixed line count: ${qWithQCount})`);

    function matchQuestionStart(line) {
        if (useQPrefix) {
            // ONLY match lines starting with Q, Question, प्र, प्रश्न
            const match = line.match(/^(?:(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*(\d+))\s*(.*)/i);
            if (match) {
                return { qNum: parseInt(match[1]), rest: match[2].trim() };
            }
            return null;
        } else {
            // Fallback match
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
        // If options have not started yet, the line must contain 'Ans' or a checkmark
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

    const questions = [];
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

    return questions;
}

const parsed = parseMCQFromText(text);
console.log(`Total questions parsed with new optionsStarted check & useQPrefix: ${parsed.length}`);
if (parsed.length > 0) {
    console.log('Sample parsed questions:');
    console.log(JSON.stringify(parsed.slice(0, 5), null, 2));
}
