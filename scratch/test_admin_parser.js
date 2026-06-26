const sampleText = `
7. Based on the English alphabetical order, three of the following four letter-clusters are
alike in a certain way and thus form a group. Which letter-cluster DOES NOT belong to
that group?

(Note: The odd man out is not based on the number of consonants/vowels or their
position in the letter-cluster.)
Ans X 1. FHJ
✔ 2. SUV
X 3. HJL
X 4. NPR

Question ID : 630680825544
Option 1 ID : 6306803233634
Option 2 ID : 6306803233635
Option 3 ID : 6306803233636
Option 4 ID : 6306803233633
Status : Answered
Chosen Option : 2

8. The position(s) of how many letters will remain unchanged if each letter in the word
GRACEFUL is arranged in the English alphabetical order?
Ans X 1. Two
✔ 2. None
X 3. One
X 4. Three

Question ID : 630680820069
Option 1 ID : 6306803212206
Option 2 ID : 6306803212204
Option 3 ID : 6306803212205
Option 4 ID : 6306803212207
Status : Answered
Chosen Option : 2
`;

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
        let questionEn = q.questionLines.join('\n').trim();
        return {
            question: questionEn,
            options: finalOptions,
            correctIndex: q.correctIndexRef.val >= 0 && q.correctIndexRef.val < 4 ? q.correctIndexRef.val : 0
        };
    });

    return parsedQuestions;
}

console.log(parseMCQFromText(sampleText));
