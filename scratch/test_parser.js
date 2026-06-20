// Scratch script to test the new parser logic
const sampleText = `
Q.7 Based on the English alphabetical order, three of the following four letter-clusters are
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

Q.8 The position(s) of how many letters will remain unchanged if each letter in the word
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

function parseMCQFromText(text) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const qRegexWithQ = /^(?:Q\s*[.]?\s*(\d+)\s*[.)]?\s*)(.*)/i;
    const qRegexWithoutQ = /^(?:Q?\s*(\d+)\s*[.)]\s*)(.*)/i;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const qMatch = line.match(qRegexWithQ) || line.match(qRegexWithoutQ);
        if (qMatch) {
            const qNum = qMatch[1];
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

                questions.push({
                    qNum,
                    question: questionEn || questionHi,
                    question_en: questionEn,
                    question_hi: questionHi || questionEn,
                    options: parsedOptions,
                    correctIndex: finalCorrectIdx
                });
                i = j;
                continue;
            }
        }
        i++;
    }
    return questions;
}

const results = parseMCQFromText(sampleText);
console.log(JSON.stringify(results, null, 2));
