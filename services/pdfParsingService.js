const fs = require('fs');
const path = require('path');
const pdfParseModule = require('pdf-parse');
const { extractQuestionsFromPdf } = require('./aiService');

// Safe pdf-parse initialization
const pdfParse = typeof pdfParseModule === 'function' 
    ? (buffer, options) => pdfParseModule(buffer, options)
    : async function(buffer, options) {
        const { PDFParse } = pdfParseModule;
        if (PDFParse) {
            const parser = new PDFParse({ verbosity: 0, data: buffer });
            const result = await parser.getText(options);
            return { text: result.text || '', numpages: result.numpages || 1 };
        }
        throw new Error('pdf-parse module is not a function and does not export PDFParse');
    };

/**
 * Maps standard Hindi option letters to index (0-based)
 */
function mapHindiOptionToIndex(letter) {
    const hindiMap = {
        'क': 0, 'ख': 1, 'ग': 2, 'घ': 3, 'ङ': 4,
        'अ': 0, 'ब': 1, 'स': 2, 'द': 3
    };
    return hindiMap[letter] !== undefined ? hindiMap[letter] : -1;
}

/**
 * Maps circled numbers to index (0-based)
 */
function mapCircleNumberToIndex(char) {
    const circleMap = {
        '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4,
        '❶': 0, '❷': 1, '❸': 2, '❹': 3, '❺': 4
    };
    return circleMap[char] !== undefined ? circleMap[char] : -1;
}

/**
 * Maps generic option key to 0-based index
 */
function mapOptionKeyToIndex(key) {
    if (!key) return -1;
    key = key.trim().toUpperCase();
    
    // Check circled numbers
    const circleIdx = mapCircleNumberToIndex(key);
    if (circleIdx !== -1) return circleIdx;

    // Check Hindi options
    const hindiIdx = mapHindiOptionToIndex(key);
    if (hindiIdx !== -1) return hindiIdx;

    // Check English characters A-E
    if (key >= 'A' && key <= 'E') {
        return key.charCodeAt(0) - 65;
    }
    if (key >= 'a' && key <= 'e') {
        return key.toLowerCase().charCodeAt(0) - 97;
    }

    // Check digits 1-5
    const num = parseInt(key, 10);
    if (num >= 1 && num <= 5) {
        return num - 1;
    }

    return -1;
}

/**
 * Scans PDF binary streams for raw JPEG image buffers, skips icons, and saves them
 */
function extractJpegsFromPDFBuffer(pdfBuffer) {
    const images = [];
    let pos = 0;
    
    // Scan up to 30 images to keep execution bounds reasonable
    while (images.length < 30) {
        // Search for JPEG start marker: FF D8 FF
        const start = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), pos);
        if (start === -1) break;
        
        // Search for JPEG end marker: FF D9
        const end = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD9]), start + 3);
        if (end === -1) {
            pos = start + 3;
            continue;
        }
        
        const jpegLen = end + 2 - start;
        // Skip small assets like icons or bullet graphics (must be > 2KB)
        if (jpegLen > 2048) {
            const jpegData = pdfBuffer.slice(start, end + 2);
            images.push(jpegData);
        }
        pos = end + 2;
    }
    return images;
}

/**
 * Cleans extracted text by stripping page numbers, headers, footers, watermarks
 */
function cleanExtractedText(text) {
    if (!text) return { text: '', promoCount: 0 };
    
    let lines = text.split('\n');
    const cleanedLines = [];
    let promoCount = 0;
    
    const blacklistPatterns = [
        /downloaded\s+from/i,
        /cracku/i,
        /ssc\s+gd\s+free\s+app/i,
        /ssc\s+gd\s+previous\s+papers/i,
        /download\s+pdf/i,
        /latest\s+pattern/i,
        /study\s+material/i,
        /youtube/i,
        /support@/i,
        /whatsapp/i,
        /all\s+rights\s+reserved/i,
        /take\s+this\s+mock/i,
        /for\s+mba\/cat\s+courses/i,
        /ssc\s+mts\s+previous\s+papers/i,
        /ssc\s+cpo\s+previous\s+papers/i,
        /ssc\s+chsl\s+previous\s+papers/i,
        /ssc\s+stenographer\s+previous\s+papers/i,
        /important\s+questions/i,
        /syllabus/i,
        /free\s+study\s+material/i,
        /^(?:Reasoning|General\s+Knowledge|GK|English|Quantitative\s+Aptitude|Mathematics|Maths?|Hindi|Section\s+[A-Z]|Part\s+[A-Z]|General\s+Awareness|Logical\s+Reasoning|Mental\s+Ability)\b/i
    ];
    
    for (let line of lines) {
        let trimmed = line.trim();
        
        // Skip metadata / watermarks / typical header/footer lines
        if (
            !trimmed ||
            /^Question ID\s*:/i.test(trimmed) ||
            /^Option\s*\d+\s*ID\s*:/i.test(trimmed) ||
            /^Status\s*:/i.test(trimmed) ||
            /^https?:\/\//i.test(trimmed) ||
            /^Page\s*\d+/i.test(trimmed) ||
            /^(?:--\s*)?\d+\s*(?:of|\/)\s*\d+(?:\s*--)?$/i.test(trimmed) ||
            /copyright/i.test(trimmed) ||
            /all rights reserved/i.test(trimmed) ||
            /testbook/i.test(trimmed) ||
            trimmed.toLowerCase() === 'testbook' ||
            /www\.[a-zA-Z0-9-]+\.[a-zA-Z]+/i.test(trimmed)
        ) {
            continue;
        }
        
        let isBlacklisted = false;
        for (let pattern of blacklistPatterns) {
            if (pattern.test(trimmed)) {
                isBlacklisted = true;
                break;
            }
        }
        
        if (isBlacklisted) {
            promoCount++;
            continue;
        }
        
        cleanedLines.push(trimmed);
    }
    
    return { text: cleanedLines.join('\n'), promoCount };
}

/**
 * Heuristically parses questions, options, answers, and explanations from text
 */
function parseQuestionsHeuristically(text, defaultCategory = 'General', defaultSubject = 'General') {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions = [];
    let currentQ = null;
    
    // Heuristic prefix checks
    // Standard Question start regex matching 1., Q1., Question 1, प्र. 1, etc.
    const qPrefixRegex = /^(?:(?:Q|Question|प्र[.]?|प्रश्न|Que|S)\s*[-.:]?\s*([0-9०-९]+)|(?:\[|\()?([0-9०-९]+)(?:\]|\))|([0-9०-९]+)\s*[-.:])\s*(.*)/i;
    // Fallback Roman question numbering (restricted to avoid matching C. / D. options)
    const romanPrefixRegex = /^(?:(?:Q|Question)?\s*[-.:]?\s*\b(i{1,3}|iv|v|vi{0,3}|ix|x|xi{1,3}|xiv|xv)\b)\s*[-.:)]\s*(.*)/i;

    function detectQuestionStart(line) {
        let match = line.match(qPrefixRegex);
        if (match) {
            const rawNum = match[1] || match[2] || match[3];
            // Normalize Hindi/Devanagari numerals to standard digits (prevent off-by-one mapping)
            const num = rawNum.replace(/[०१२३४५६७८९]/g, d => '0123456789'['०१२३४५६७८९'.indexOf(d)]);
            return { qNum: parseInt(num, 10), rest: match[4].trim() };
        }
        match = line.match(romanPrefixRegex);
        if (match) {
            return { qNum: match[1].toLowerCase(), rest: match[2].trim() };
        }
        return null;
    }

    // Matches standard options headers like (A), A., A), क), ①
    // Handles E / 5 / Devanagari options
    const optionHeaderRegex = /(?:^|[\s✔✓✅☑(\[{-])(?:\(|\[)?([A-E1-5क-ङa-e①-⑤])(?:\)|\]|\.|\))(?:\s|$)/gi;

    function parseOptionsFromLine(line, optionsArray, correctIndexRef, optionsStarted) {
        // Collect all potential option keys and their indexes
        const matches = [];
        let match;
        optionHeaderRegex.lastIndex = 0;
        
        while ((match = optionHeaderRegex.exec(line)) !== null) {
            const key = match[1];
            const idx = mapOptionKeyToIndex(key);
            if (idx >= 0 && idx < 5) {
                matches.push({
                    key,
                    index: match.index,
                    length: match[0].length,
                    mappedIndex: idx
                });
            }
        }

        // Inline option splitting (e.g. A. option1 B. option2 C. option3 D. option4)
        if (matches.length >= 2) {
            // Ensure sequence index increases or is consistent
            let lastIdx = -1;
            const validMatches = [];
            for (let m of matches) {
                if (m.mappedIndex > lastIdx) {
                    validMatches.push(m);
                    lastIdx = m.mappedIndex;
                }
            }

            if (validMatches.length >= 2) {
                for (let i = 0; i < validMatches.length; i++) {
                    const currentMatch = validMatches[i];
                    const currentIdx = currentMatch.mappedIndex;
                    
                    const startTextIdx = currentMatch.index + currentMatch.length;
                    const endTextIdx = (i + 1 < validMatches.length) 
                        ? validMatches[i + 1].index 
                        : line.length;

                    const optionText = line.substring(startTextIdx, endTextIdx).trim();
                    optionsArray[currentIdx] = optionText;

                    // Verify correct marks around option headers
                    const checkArea = line.substring(Math.max(0, currentMatch.index - 5), currentMatch.index + currentMatch.length);
                    if (/[✔✓✅☑]/.test(checkArea)) {
                        correctIndexRef.val = currentIdx;
                    }
                }
                return true;
            }
        }

        // Single option line parse (e.g. "A) option text") - Removed \b word boundary to support Hindi/circled options
        const singleMatch = line.match(/^(?:Ans\s*)?([^a-zA-Z0-9\u0900-\u097F]*(?:[xX✔✓✅☑][^a-zA-Z0-9\u0900-\u097F]*)?)([A-E1-5क-ङa-e①-⑤])(?:\)|\]|\.|\s)\s*(.*)/i);
        if (singleMatch) {
            const prefix = singleMatch[1];
            const key = singleMatch[2];
            const text = singleMatch[3].trim();
            const idx = mapOptionKeyToIndex(key);

            if (idx >= 0 && idx < 5) {
                optionsArray[idx] = text;
                if (/[✔✓✅☑]/.test(prefix) || /[✔✓✅☑]/.test(line.substring(0, Math.min(line.length, 10)))) {
                    correctIndexRef.val = idx;
                }
                return true;
            }
        }

        return false;
    }

    // Matches answer formats: Answer: B, Ans: B, Correct Option: C, उत्तर: B, etc.
    const answerRegex = /^(?:ans(?:wer)?|correct\s*(?:answer|option)?|key|उत्तर)\s*[:\-.]?\s*(\(?[A-E1-5क-ङa-e①-⑤]\)?)\.?$/i;
    const chosenOptionRegex = /Chosen\s*Option\s*:\s*([1-5A-Ea-eक-ङ①-⑤]|\-\-)/i;

    function parseAnswerFromLine(line) {
        const chosenMatch = line.match(chosenOptionRegex);
        if (chosenMatch && chosenMatch[1] !== '--') {
            return mapOptionKeyToIndex(chosenMatch[1]);
        }
        const ansMatch = line.match(answerRegex);
        if (ansMatch) {
            const cleanVal = ansMatch[1].replace(/[()]/g, '');
            return mapOptionKeyToIndex(cleanVal);
        }
        return null;
    }

    // Matches explanation formats: Explanation, Solution, Sol., व्याख्या, हल
    const explanationRegex = /^(?:explanation|solution|sol[.]?|व्याख्या|हल)\s*[:\-.]?\s*(.*)/i;
    const stopHeaders = [
        /^(?:Answer\s*Keys?|Detailed\s*Solutions|Detailed\s*Explanations|Correct\s*Answers|Correct\s*Options|उत्तर\s*तालिका|उत्तरमाला|कुंजी|हल\s*माला)\b/i,
        /^Solutions\b/i,
        /^Explanations\b/i,
        /^Answers\b/i
    ];

    let ignoreNewQuestions = false;
    let expectedNextNum = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if we hit a stop header section
        if (!ignoreNewQuestions) {
            for (let header of stopHeaders) {
                if (header.test(line) && line.length < 30) {
                    ignoreNewQuestions = true;
                    console.log(`[pdfParsingService] Stop header matched: "${line}". Ignoring subsequent new questions.`);
                    break;
                }
            }
        }

        const qStart = detectQuestionStart(line);
        if (qStart && !ignoreNewQuestions) {
            // Check sequence
            let isSequential = false;
            if (questions.length === 0) {
                // First question detected, establish starting sequence
                isSequential = true;
                expectedNextNum = qStart.qNum + 1;
            } else {
                if (qStart.qNum === expectedNextNum) {
                    isSequential = true;
                    expectedNextNum++;
                } else if (qStart.qNum === 1) {
                    // Section restart
                    isSequential = true;
                    expectedNextNum = 2;
                }
            }

            if (isSequential) {
                if (currentQ) {
                    questions.push(currentQ);
                }
                currentQ = {
                    questionNumber: qStart.qNum,
                    questionLines: qStart.rest ? [qStart.rest] : [],
                    options: ['', '', '', '', ''], // Supports up to 5 options (E)
                    correctIndexRef: { val: -1 },
                    optionsStarted: false,
                    explanationLines: [],
                    explanationStarted: false,
                    category: defaultCategory,
                    subject: defaultSubject
                };
                continue;
            } else {
                console.log(`[pdfParsingService] Non-sequential question number detected (Expected: ${expectedNextNum}, Got: ${qStart.qNum}). Merging as regular line: "${line}"`);
            }
        }

        if (currentQ) {
            // Check explanation keyword
            const expMatch = line.match(explanationRegex);
            if (expMatch) {
                currentQ.explanationStarted = true;
                if (expMatch[1]) currentQ.explanationLines.push(expMatch[1].trim());
                continue;
            }

            if (currentQ.explanationStarted) {
                currentQ.explanationLines.push(line);
                continue;
            }

            // Check correct answer keyword
            const ansIdx = parseAnswerFromLine(line);
            if (ansIdx !== null && ansIdx >= 0) {
                currentQ.correctIndexRef.val = ansIdx;
                continue;
            }

            // Check option headers
            const isOpt = parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef, currentQ.optionsStarted);
            if (isOpt) {
                currentQ.optionsStarted = true;
                continue;
            }

            // Accumulate wrapped text
            if (currentQ.optionsStarted) {
                const lastFilledIdx = currentQ.options.reduce((acc, val, idx) => val ? idx : acc, -1);
                if (lastFilledIdx !== -1) {
                    currentQ.options[lastFilledIdx] += ' ' + line;
                }
            } else {
                currentQ.questionLines.push(line);
            }
        }
    }

    if (currentQ) {
        questions.push(currentQ);
    }

    // Format into standard JSON structure
    return questions.map(q => {
        // Clean options and filter out empty trailing option (e.g. Option E if unused)
        const rawOptions = q.options.map(o => o.trim()).filter(Boolean);

        // Split question lines into English / Hindi if bilingual
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

        // Heuristically join wrapped lines with space to heal breaks (Requirement 6)
        let questionEn = englishLines.join(' ').replace(/\s+/g, ' ').trim();
        let questionHi = hindiLines.join(' ').replace(/\s+/g, ' ').trim();

        if (!questionEn && !questionHi) {
            questionEn = `[Question ${q.questionNumber}]`;
            questionHi = `[Question ${q.questionNumber}]`;
        } else if (!questionEn) {
            questionEn = questionHi;
        } else if (!questionHi) {
            questionHi = questionEn;
        }

        // Split explanation lines
        let expEnLines = [];
        let expHiLines = [];
        let expHasHindi = false;

        q.explanationLines.forEach(line => {
            const hasHindi = /[\u0900-\u097F]/.test(line);
            if (hasHindi) {
                expHasHindi = true;
                expHiLines.push(line);
            } else {
                if (expHasHindi) {
                    expHiLines.push(line);
                } else {
                    expEnLines.push(line);
                }
            }
        });

        const explanationEn = expEnLines.join(' ').replace(/\s+/g, ' ').trim();
        const explanationHi = expHiLines.join(' ').replace(/\s+/g, ' ').trim();

        const correctIdx = q.correctIndexRef.val >= 0 && q.correctIndexRef.val < rawOptions.length ? q.correctIndexRef.val : 0;
        const alphabet = ['A', 'B', 'C', 'D', 'E'];
        const ansLabel = alphabet[correctIdx] || 'A';

        return {
            questionNumber: q.questionNumber || 1,
            question: questionEn,
            question_en: questionEn,
            question_hi: questionHi,
            optionA: rawOptions[0] || '',
            optionB: rawOptions[1] || '',
            optionC: rawOptions[2] || '',
            optionD: rawOptions[3] || '',
            optionE: rawOptions[4] || '',
            options: rawOptions,
            options_en: rawOptions,
            options_hi: rawOptions,
            answer: ansLabel,
            correctAnswer: rawOptions[correctIdx] || '',
            correctIndex: correctIdx,
            explanation: explanationEn,
            explanation_hi: explanationHi,
            language: /[\u0900-\u097F]/.test(questionEn + questionHi) ? 'Hindi' : 'English',
            image: '',
            type: 'MCQ',
            category: q.category,
            subject: q.subject
        };
    });
}

/**
 * Universal PDF Parsing pipeline
 */
async function parsePDF(pdfBuffer, defaults = {}, expectedCount = 100, onProgress = null) {
    const startTime = Date.now();
    let text = '';
    let totalPages = 1;
    let isScanned = false;
    let questions = [];
    let imagesSaved = [];
    let ocrUsed = false;
    let promoLinesRemoved = 0;
    let initialDetectedCount = 0;
    let rejectedCount = 0;
    let duplicateQuestions = 0;
    const rejectedReasons = [];

    const defaultCategory = defaults.category || 'General';
    const defaultSubject = defaults.subject || 'General';

    // 1. Image extraction from binary stream (Step 10)
    if (onProgress) onProgress(5, 'Extracting images', 'Scanning PDF buffer for embedded images...');
    try {
        const imageBuffers = extractJpegsFromPDFBuffer(pdfBuffer);
        const uploadDir = path.join(__dirname, '../public/uploads/questions');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        imageBuffers.forEach((buf, idx) => {
            const filename = `extracted_${Date.now()}_img_${idx + 1}.jpg`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, buf);
            imagesSaved.push(`/uploads/questions/${filename}`);
        });
        console.log(`[pdfParsingService] Extracted ${imagesSaved.length} images from PDF.`);
    } catch (imgErr) {
        console.error('[pdfParsingService] Image extraction failed:', imgErr.message);
    }

    // 2. Extract raw text with pdf-parse
    if (onProgress) onProgress(15, 'Extracting text', 'Extracting selectable text from pages...');
    try {
        const result = await pdfParse(pdfBuffer);
        text = result.text || '';
        totalPages = result.numpages || 1;
    } catch (pdfErr) {
        console.error('[pdfParsingService] pdf-parse failed:', pdfErr.message);
        isScanned = true;
    }

    // Automatically check if PDF is scanned (Step 1)
    if (!isScanned && text.trim().length < 150) {
        isScanned = true;
    }

    // 3. Fallback to Gemini AI OCR if scanned, OR if regex parser fails to extract questions
    if (isScanned && process.env.GEMINI_API_KEY) {
        ocrUsed = true;
        if (onProgress) onProgress(30, 'Running AI OCR', 'Scanned PDF detected. Running Gemini Multimodal OCR...');
        try {
            const aiQuestions = await extractQuestionsFromPdf(pdfBuffer, {
                category: defaultCategory,
                subject: defaultSubject
            });
            questions = normalizeAIQuestions(aiQuestions, defaultCategory, defaultSubject);
            initialDetectedCount = questions.length;
        } catch (aiErr) {
            console.error('[pdfParsingService] Gemini AI OCR fallback failed:', aiErr.message);
            throw new Error(`Scanned PDF OCR failed: ${aiErr.message}`);
        }
    } else {
        // Parse selectable text using regex heuristics (Step 3-9, 12-15)
        if (onProgress) onProgress(30, 'Regex Heuristics', 'Running clean regex heuristic parser...');
        const cleanResult = cleanExtractedText(text);
        promoLinesRemoved = cleanResult.promoCount;
        questions = parseQuestionsHeuristically(cleanResult.text, defaultCategory, defaultSubject);
        initialDetectedCount = questions.length;

        // AI Recovery: If regex extracted nothing or way fewer questions than expected, trigger AI recovery (Step 19)
        const tooFew = questions.length < (expectedCount * 0.4);
        if ((questions.length === 0 || tooFew) && process.env.GEMINI_API_KEY) {
            ocrUsed = true;
            if (onProgress) {
                onProgress(50, 'Running AI Recovery', `Regex extracted only ${questions.length} questions. Running Gemini AI layout recovery...`);
            }
            try {
                const aiQuestions = await extractQuestionsFromPdf(pdfBuffer, {
                    category: defaultCategory,
                    subject: defaultSubject
                });
                const normalized = normalizeAIQuestions(aiQuestions, defaultCategory, defaultSubject);
                if (normalized.length > 0) {
                    questions = normalized;
                    initialDetectedCount = questions.length;
                    console.log(`[pdfParsingService] AI Recovery succeeded. Extracted ${questions.length} questions.`);
                }
            } catch (recoveryErr) {
                console.error('[pdfParsingService] Gemini AI Recovery failed:', recoveryErr.message);
            }
        }
    }

    // 4. Attach extracted images to matching question numbers (Step 10)
    questions.forEach((q, idx) => {
        if (imagesSaved[idx]) {
            q.image = imagesSaved[idx];
        }
    });

    // 5. Final validation checks (Step 18)
    questions = questions.map((q, idx) => {
        const errors = [];
        if (!q.question || q.question.trim().startsWith('[Question')) {
            errors.push('Question text is missing or invalid.');
        }
        
        const validOpts = q.options.filter(o => o && o.trim() !== '');
        if (validOpts.length < 2) {
            errors.push(`Missing valid options (found only ${validOpts.length}, minimum 2 required).`);
        }
        
        return {
            ...q,
            questionNumber: q.questionNumber || (idx + 1),
            isValid: errors.length === 0,
            validationErrors: errors
        };
    });

    // Enforce strict question filter rules (Requirement 2, 4, 7, 9)
    questions = questions.filter(q => {
        const reasons = [];
        if (!q.question || q.question.trim().length <= 15) {
            reasons.push('Question text missing or too short (length <= 15)');
        }
        // Count non-empty options
        const validOptionCount = q.options.filter(o => o && o.trim() !== '').length;
        if (validOptionCount < 4) {
            reasons.push(`Fewer than 4 valid options (found ${validOptionCount})`);
        }
        if (!q.questionNumber) {
            reasons.push('Question number missing');
        }

        if (reasons.length > 0) {
            rejectedCount++;
            rejectedReasons.push(`Q#${q.questionNumber || 'unknown'}: ${reasons.join(', ')}`);
            console.log(`[pdfParsingService] Strictly rejecting question candidate: ${reasons.join(' | ')}`);
            return false;
        }
        return true;
    });

    // 6. Sequential verification and false-positive filter (Requirement 13)
    const cleanupResult = verifyAndFilterFalsePositives(questions);
    questions = cleanupResult.questions;
    duplicateQuestions = cleanupResult.duplicateCount;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Log detailed statistics (Requirement 12)
    console.log(`
==================================================
        UNIVERSAL PDF PARSER REPORT
==================================================
Total Pages: ${totalPages}
Questions Detected: ${initialDetectedCount}
Questions Rejected: ${rejectedCount}
Rejected Reasons: 
  ${rejectedReasons.length > 0 ? rejectedReasons.join('\n  ') : 'None'}
Promotional Lines Removed: ${promoLinesRemoved}
OCR Used: ${ocrUsed ? 'YES' : 'NO'}
Images Extracted: ${imagesSaved.length}
Duplicate Questions Merged/Skipped: ${duplicateQuestions}
Final Questions Saved: ${questions.length}
Import Time: ${elapsed} seconds
==================================================
`);

    return questions;
}

/**
 * Cleanup false positive questions by aligning with the highest detected question number (Requirement 13)
 */
function verifyAndFilterFalsePositives(questions) {
    if (questions.length === 0) return { questions: [], duplicateCount: 0 };

    const highestQNum = Math.max(...questions.map(q => q.questionNumber));
    let duplicateCount = 0;
    
    if (questions.length > highestQNum) {
        console.log(`[pdfParsingService] Invalid count detected: Questions count (${questions.length}) > Highest Question Number (${highestQNum}). Running automated false-positive cleanup.`);
        
        const bestQuestionsMap = new Map();
        
        questions.forEach(q => {
            const num = q.questionNumber;
            if (num > highestQNum || num < 1) {
                console.log(`[pdfParsingService] Discarding out-of-bounds Q#${num}: "${q.question.substring(0, 30)}..."`);
                return;
            }
            
            if (!bestQuestionsMap.has(num)) {
                bestQuestionsMap.set(num, q);
            } else {
                duplicateCount++;
                const existing = bestQuestionsMap.get(num);
                const currentScore = (q.isValid ? 1000 : 0) + q.question.length;
                const existingScore = (existing.isValid ? 1000 : 0) + existing.question.length;
                if (currentScore > existingScore) {
                    bestQuestionsMap.set(num, q);
                    console.log(`[pdfParsingService] Replacing duplicate Q#${num} with a better match`);
                } else {
                    console.log(`[pdfParsingService] Skipping duplicate Q#${num}`);
                }
            }
        });
        
        let filtered = Array.from(bestQuestionsMap.values());
        filtered.sort((a, b) => a.questionNumber - b.questionNumber);
        
        console.log(`[pdfParsingService] Cleanup complete. New questions count: ${filtered.length}`);
        return { questions: filtered, duplicateCount };
    }
    
    return { questions, duplicateCount };
}

/**
 * Normalizes questions returned by Gemini AI to match the backend structure
 */
function normalizeAIQuestions(aiQuestions, defaultCategory, defaultSubject) {
    if (!Array.isArray(aiQuestions)) return [];
    
    return aiQuestions.map((q, idx) => {
        const opts = q.options || q.options_en || [];
        const optsHi = q.options_hi || opts;

        let correctIdx = q.correctIndex;
        if (correctIdx === undefined || correctIdx < 0 || correctIdx >= opts.length) {
            if (q.correctAnswer) {
                correctIdx = opts.findIndex(o => o && o.toString().trim() === q.correctAnswer.toString().trim());
            }
        }
        if (correctIdx === undefined || correctIdx === -1) {
            correctIdx = 0;
        }

        const alphabet = ['A', 'B', 'C', 'D', 'E'];

        return {
            questionNumber: q.questionNumber || (idx + 1),
            question: q.question || q.question_en || '',
            question_en: q.question_en || q.question || '',
            question_hi: q.question_hi || q.question || '',
            optionA: opts[0] || '',
            optionB: opts[1] || '',
            optionC: opts[2] || '',
            optionD: opts[3] || '',
            optionE: opts[4] || '',
            options: opts,
            options_en: opts,
            options_hi: optsHi,
            answer: alphabet[correctIdx] || 'A',
            correctAnswer: opts[correctIdx] || q.correctAnswer || '',
            correctIndex: correctIdx,
            explanation: q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            language: /[\u0900-\u097F]/.test(q.question || q.question_hi) ? 'Hindi' : 'English',
            image: q.image || '',
            type: 'MCQ',
            category: q.category || defaultCategory,
            subject: q.subject || defaultSubject
        };
    });
}

module.exports = {
    parsePDF,
    cleanExtractedText,
    parseQuestionsHeuristically,
    verifyAndFilterFalsePositives
};
