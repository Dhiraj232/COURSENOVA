const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas');
const { extractQuestionsFromPdf } = require('./aiService');

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
        '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5,
        '❶': 0, '❷': 1, '❸': 2, '❹': 3, '❺': 4, '❻': 5
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

    // Check English characters A-F
    if (key >= 'A' && key <= 'F') {
        return key.charCodeAt(0) - 65;
    }
    if (key >= 'a' && key <= 'f') {
        return key.toLowerCase().charCodeAt(0) - 97;
    }

    // Check digits 1-6
    const num = parseInt(key, 10);
    if (num >= 1 && num <= 6) {
        return num - 1;
    }

    return -1;
}

/**
 * Normalizes text encoding (ﬁ -> fi, etc.) and Unicode equivalence
 */
function normalizeText(text) {
    if (!text) return '';
    
    let normalized = text.normalize('NFKC');
    
    normalized = normalized
        .replace(/ﬁ/g, 'fi')
        .replace(/ﬂ/g, 'fl')
        .replace(/–/g, '-') // en-dash
        .replace(/—/g, '-') // em-dash
        .replace(/•/g, ' * ') // bullet points
        .replace(/\uFFFD/g, '') // remove unresolvable symbols
        .replace(/\u0000/g, '') // remove null byte characters
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); // remove invisible control characters
        
    const lines = normalized.split('\n');
    const promoPatterns = [
        /Downloaded\s+from/i,
        /Cracku/i,
        /Testbook/i,
        /Page\s+\d+\s+of\s+\d+/i,
        /Copyright\s+©/i,
        /www\.\S+/i,
        /CourseNova/i,
        /SSC\s+GD\s+Free\s+App/i
    ];
    
    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        for (let pattern of promoPatterns) {
            if (pattern.test(trimmed)) {
                return false;
            }
        }
        return true;
    });
    
    return cleanedLines.join('\n');
}

function cleanExtractedText(text) {
    if (!text) return { text: '', promoCount: 0 };
    const rawLinesCount = text.split('\n').length;
    const cleanedText = normalizeText(text);
    const cleanLinesCount = cleanedText.split('\n').length;
    return {
        text: cleanedText,
        promoCount: Math.max(0, rawLinesCount - cleanLinesCount)
    };
}

/**
 * Converts space-aligned columns of text into HTML table format
 */
function convertTextTablesToHtml(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let inTable = false;
    let tableRows = [];
    const newLines = [];
    
    for (let line of lines) {
        // Detect potential row: segments separated by 2 or more spaces
        const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2 && parts.length <= 8 && !/^[A-F1-6①-⑥क-घ]\b/.test(line)) { 
            // Must not start with option header to avoid misclassifying options as table
            if (!inTable) {
                inTable = true;
                tableRows = [parts];
            } else {
                if (Math.abs(parts.length - tableRows[0].length) <= 1) {
                    tableRows.push(parts);
                } else {
                    newLines.push(renderHtmlTable(tableRows));
                    tableRows = [parts];
                }
            }
        } else {
            if (inTable) {
                newLines.push(renderHtmlTable(tableRows));
                inTable = false;
                tableRows = [];
            }
            newLines.push(line);
        }
    }
    if (inTable) {
        newLines.push(renderHtmlTable(tableRows));
    }
    return newLines.join('\n');
}

function renderHtmlTable(rows) {
    let html = '<table class="table-preview" style="border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 0.85rem; border: 1px solid #cbd5e1;">';
    rows.forEach((row, rIdx) => {
        html += '<tr style="border-bottom: 1px solid #cbd5e1;">';
        row.forEach(cell => {
            const tag = rIdx === 0 ? 'th' : 'td';
            const style = rIdx === 0 ? 'background: #f1f5f9; font-weight: 600; padding: 6px 10px; text-align: left;' : 'padding: 6px 10px;';
            html += `<${tag} style="${style}">${cell}</${tag}>`;
        });
        html += '</tr>';
    });
    html += '</table>';
    return html;
}

/**
 * Extracts page items, detects column boundary gutters, and sorts text cleanly.
 */
function extractTextFromPageItems(items, pageWidth = 595) {
    if (items.length === 0) return '';

    const textItems = items.filter(item => item.str && item.str.trim().length > 0);
    if (textItems.length === 0) return '';

    const minX = Math.min(...textItems.map(item => item.transform[4]));
    const maxX = Math.max(...textItems.map(item => item.transform[4] + (item.width || 0)));
    const span = maxX - minX;

    const numBins = 60;
    const binWidth = span / numBins;
    const bins = new Array(numBins).fill(false);

    const ys = textItems.map(item => item.transform[5]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const heightSpan = maxY - minY;
    const midYMin = minY + heightSpan * 0.15;
    const midYMax = minY + heightSpan * 0.85;

    textItems.forEach(item => {
        const y = item.transform[5];
        if (y < midYMin || y > midYMax) return; 

        const itemWidth = item.width || 0;
        if (itemWidth > span * 0.6) return;

        const xStart = item.transform[4] - minX;
        const xEnd = xStart + itemWidth;

        const startBin = Math.max(0, Math.floor(xStart / binWidth));
        const endBin = Math.min(numBins - 1, Math.ceil(xEnd / binWidth));

        for (let b = startBin; b <= endBin; b++) {
            bins[b] = true;
        }
    });

    const startCheckBin = Math.floor(numBins * 0.25);
    const endCheckBin = Math.floor(numBins * 0.75);
    
    let gaps = [];
    let currentGapStart = -1;

    for (let b = startCheckBin; b <= endCheckBin; b++) {
        if (!bins[b]) {
            if (currentGapStart === -1) {
                currentGapStart = b;
            }
        } else {
            if (currentGapStart !== -1) {
                const gapWidth = b - currentGapStart;
                if (gapWidth >= 2) { 
                    gaps.push({ start: currentGapStart, end: b - 1, width: gapWidth });
                }
                currentGapStart = -1;
            }
        }
    }
    if (currentGapStart !== -1) {
        gaps.push({ start: currentGapStart, end: endCheckBin, width: endCheckBin - currentGapStart + 1 });
    }

    gaps.sort((a, b) => b.width - a.width);

    let colBoundaries = [];
    if (gaps.length >= 2 && gaps[0].width >= 2 && gaps[1].width >= 2) {
        const bound1 = minX + gaps[0].start * binWidth + (gaps[0].width * binWidth / 2);
        const bound2 = minX + gaps[1].start * binWidth + (gaps[1].width * binWidth / 2);
        colBoundaries = [Math.min(bound1, bound2), Math.max(bound1, bound2)];
    } else if (gaps.length >= 1 && gaps[0].width >= 2) {
        const bound = minX + gaps[0].start * binWidth + (gaps[0].width * binWidth / 2);
        colBoundaries = [bound];
    }

    let columns = colBoundaries.length === 0 ? [textItems] : Array.from({ length: colBoundaries.length + 1 }, () => []);

    if (colBoundaries.length > 0) {
        textItems.forEach(item => {
            const x = item.transform[4];
            let colIdx = 0;
            while (colIdx < colBoundaries.length && x >= colBoundaries[colIdx]) {
                colIdx++;
            }
            columns[colIdx].push(item);
        });

        // Column balance check to discard false-positive watermarks/sidebar splits
        const totalCount = textItems.length;
        let isBalanced = true;
        for (let colItems of columns) {
            if (colItems.length < totalCount * 0.15 && colItems.length < 12) {
                isBalanced = false;
                break;
            }
        }

        if (!isBalanced) {
            colBoundaries = [];
            columns = [textItems];
        }
    }

    let pageText = '';
    columns.forEach((colItems) => {
        colItems.sort((a, b) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            if (Math.abs(yA - yB) < 3.5) {
                return a.transform[4] - b.transform[4];
            }
            return yB - yA;
        });

        let colText = '';
        let lastY = -1;
        colItems.forEach(item => {
            const y = item.transform[5];
            if (lastY === -1) {
                colText += item.str;
            } else if (Math.abs(y - lastY) < 3.5) {
                colText += ' ' + item.str;
            } else {
                colText += '\n' + item.str;
            }
            lastY = y;
        });

        pageText += (pageText ? '\n\n' : '') + colText;
    });

    return pageText;
}

/**
 * Assesses the selectable text quality of a page
 */
function assessTextQuality(text) {
    if (!text || text.trim().length < 100) return 0;
    
    // Check replacement character count (\uFFFD)
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const replacementRatio = replacementCount / text.length;
    
    // Check proportion of standard letters/numbers to detect gibberish encoding
    const letterCount = (text.match(/[a-zA-Z\u0900-\u097F0-9]/g) || []).length;
    const nonWhitespaceCount = text.replace(/\s/g, '').length;
    const letterRatio = letterCount / Math.max(1, nonWhitespaceCount);
    
    if (replacementRatio > 0.05) return 0.5; // low quality
    if (letterRatio < 0.6) return 0.4;        // corrupted fonts
    
    return 1.0; // high quality
}

/**
 * Extracts embedded JPEG images page by page
 */
async function extractImagesFromPage(page, pageNum) {
    const images = [];
    try {
        const operatorList = await page.getOperatorList();
        const objIds = [];
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
                objIds.push(operatorList.argsArray[i][0]);
            }
        }
        for (let objId of objIds) {
            // Promise race to prevent page.objs.get from hanging forever on unresolvable images
            const img = await Promise.race([
                new Promise((resolve) => {
                    page.objs.get(objId, (o) => resolve(o));
                }),
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), 1000);
                })
            ]);
            
            if (img && img.width > 20 && img.height > 20) {
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');
                const imgData = ctx.createImageData(img.width, img.height);
                const data = imgData.data;
                const src = img.data;
                
                if (img.data.length === img.width * img.height * 3) {
                    let dstIdx = 0;
                    for (let srcIdx = 0; srcIdx < src.length; srcIdx += 3) {
                        data[dstIdx] = src[srcIdx];
                        data[dstIdx + 1] = src[srcIdx + 1];
                        data[dstIdx + 2] = src[srcIdx + 2];
                        data[dstIdx + 3] = 255;
                        dstIdx += 4;
                    }
                } else {
                    data.set(src);
                }
                ctx.putImageData(imgData, 0, 0);
                const buffer = canvas.toBuffer('image/jpeg');
                images.push({
                    buffer,
                    width: img.width,
                    height: img.height,
                    pageNum
                });
            }
        }
    } catch (err) {
        // Safe skip image extraction error
    }
    return images;
}

/**
 * Heuristically parses questions, options, answers, and explanations from text
 */
function parseQuestionsHeuristically(text, defaultCategory = 'General', defaultSubject = 'General') {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions = [];
    let currentQ = null;
    let expectedNextNum = 1;
    let currentPageNum = 1;
    
    // Match question starts
    const qPrefixRegex = /^(?:(?:Q|Question|प्र[.]?|प्रश्न|Que|S)\s*[-.:]?\s*([0-9०-९]+)|(?:\[|\()?([0-9०-९]+)(?:\]|\))|([0-9०-९]+)\s*[-.:)\]])\s*(.*)/i;
    const romanPrefixRegex = /^(?:(?:Q|Question)?\s*[-.:]?\s*\b(i{1,3}|iv|v|vi{0,3}|ix|x|xi{1,3}|xiv|xv)\b)\s*[-.:)\]]\s*(.*)/i;

    function detectQuestionStart(line) {
        let match = line.match(qPrefixRegex);
        if (match) {
            const rawNum = match[1] || match[2] || match[3];
            const num = rawNum.replace(/[०१२३४५६७८९]/g, d => '0123456789'['०१२३४५६७८९'.indexOf(d)]);
            return { qNum: parseInt(num, 10), rest: match[4] ? match[4].trim() : '' };
        }
        match = line.match(romanPrefixRegex);
        if (match) {
            return { qNum: match[1].toLowerCase(), rest: match[2] ? match[2].trim() : '' };
        }
        return null;
    }

    // Option header pattern (e.g. A., A), (A), क), ख), ①, Option A)
    const optionHeaderRegex = /(?:^|[\s✔✓✅☑(\[{-])(?:\(|\[)?([A-F1-6क-ङa-f①-⑥])(?:\)|\]|\.|\s)(?:\s|$)/gi;

    function parseOptionsFromLine(line, optionsArray, correctIndexRef) {
        let matches = [];
        let match;
        optionHeaderRegex.lastIndex = 0;
        while ((match = optionHeaderRegex.exec(line)) !== null) {
            const key = match[1];
            const idx = mapOptionKeyToIndex(key);
            if (idx >= 0 && idx < 6) {
                matches.push({
                    key,
                    index: match.index,
                    length: match[0].length,
                    mappedIndex: idx
                });
            }
        }

        // Inline splitting (e.g. A. option1 B. option2 C. option3 D. option4)
        if (matches.length >= 2) {
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
                    const endTextIdx = (i + 1 < validMatches.length) ? validMatches[i + 1].index : line.length;
                    const optionText = line.substring(startTextIdx, endTextIdx).trim();
                    optionsArray[currentIdx] = optionText;

                    const checkArea = line.substring(Math.max(0, currentMatch.index - 5), currentMatch.index + currentMatch.length);
                    if (/[✔✓✅☑]/.test(checkArea)) {
                        correctIndexRef.val = currentIdx;
                    }
                }
                return true;
            }
        }

        // Single option line
        const singleMatch = line.match(/^(?:Ans\s*)?([^a-zA-Z0-9\u0900-\u097F]*(?:[xX✔✓✅☑][^a-zA-Z0-9\u0900-\u097F]*)?)([A-F1-6क-ङa-f①-⑥])(?:\)|\]|\.|\s)\s*(.*)/i);
        if (singleMatch) {
            const prefix = singleMatch[1];
            const key = singleMatch[2];
            const text = singleMatch[3].trim();
            const idx = mapOptionKeyToIndex(key);

            if (idx >= 0 && idx < 6) {
                optionsArray[idx] = text;
                if (/[✔✓✅☑]/.test(prefix) || /[✔✓✅☑]/.test(line.substring(0, Math.min(line.length, 10)))) {
                    correctIndexRef.val = idx;
                }
                return true;
            }
        }
        return false;
    }

    // Answers detection
    const answerRegex = /^(?:ans(?:wer)?|correct\s*(?:answer|option)?|key|solution|explanation|उत्तर|हल)\s*[:\-.]?\s*(\(?[A-F1-6क-ङa-f①-⑥]\)?)\.?$/i;
    const chosenOptionRegex = /Chosen\s*Option\s*:\s*([1-6A-Fa-fक-ङ①-⑥]|\-\-)/i;

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

    const explanationRegex = /^(?:explanation|solution|sol[.]?|hints|व्याख्या|हल)\s*[:\-.]?\s*(.*)/i;
    const stopHeaders = [
        /^(?:Answer\s*Keys?|Detailed\s*Solutions|Detailed\s*Explanations|Correct\s*Answers|Correct\s*Options|उत्तर\s*तालिका|उत्तरमाला|कुंजी|हल\s*माला)\b/i,
        /^Solutions\b/i,
        /^Explanations\b/i,
        /^Answers\b/i
    ];

    let ignoreNewQuestions = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track page marker
        const pageMarkerMatch = line.match(/^\[PAGE_MARKER_(\d+)\]$/);
        if (pageMarkerMatch) {
            currentPageNum = parseInt(pageMarkerMatch[1], 10);
            continue;
        }

        if (!ignoreNewQuestions) {
            for (let header of stopHeaders) {
                if (header.test(line) && line.length < 30) {
                    ignoreNewQuestions = true;
                    break;
                }
            }
        }

        const qStart = detectQuestionStart(line);
        if (qStart && !ignoreNewQuestions) {
            let isNewQ = false;
            if (questions.length === 0) {
                isNewQ = true;
                expectedNextNum = (typeof qStart.qNum === 'number') ? qStart.qNum + 1 : 2;
            } else {
                const isOptionNumber = currentQ && currentQ.optionsStarted && typeof qStart.qNum === 'number' && qStart.qNum <= 6 && qStart.qNum !== expectedNextNum;
                if (!isOptionNumber) {
                    isNewQ = true;
                    if (typeof qStart.qNum === 'number') {
                        expectedNextNum = qStart.qNum + 1;
                    }
                }
            }

            if (isNewQ) {
                if (currentQ) {
                    questions.push(currentQ);
                }
                currentQ = {
                    questionNumber: qStart.qNum,
                    questionLines: qStart.rest ? [qStart.rest] : [],
                    options: ['', '', '', '', '', ''], 
                    correctIndexRef: { val: -1 },
                    optionsStarted: false,
                    explanationLines: [],
                    explanationStarted: false,
                    category: defaultCategory,
                    subject: defaultSubject,
                    pageNum: currentPageNum
                };
                continue;
            }
        }

        if (currentQ) {
            const expMatch = line.match(explanationRegex);
            if (expMatch) {
                currentQ.explanationStarted = true;
                if (expMatch[1]) currentQ.explanationLines.push(expMatch[1].trim());
                continue;
            }

            if (currentQ.explanationStarted) {
                const nextQStart = detectQuestionStart(line);
                if (nextQStart && !ignoreNewQuestions) {
                    // propagates to new question start in next loop iteration
                } else {
                    currentQ.explanationLines.push(line);
                    continue;
                }
            }

            const ansIdx = parseAnswerFromLine(line);
            if (ansIdx !== null && ansIdx >= 0) {
                currentQ.correctIndexRef.val = ansIdx;
                continue;
            }

            const isOpt = parseOptionsFromLine(line, currentQ.options, currentQ.correctIndexRef);
            if (isOpt) {
                currentQ.optionsStarted = true;
                continue;
            }

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

    return questions.map(q => {
        const rawOptions = q.options.map(o => o.trim()).filter(Boolean);

        let englishLines = [];
        let hindiLines = [];
        
        q.questionLines.forEach(line => {
            const hasDevanagari = /[\u0900-\u097F]/.test(line);
            const hasEnglish = /[a-zA-Z]/.test(line);
            
            if (hasDevanagari && hasEnglish) {
                hindiLines.push(line);
                const englishPart = line.replace(/[\u0900-\u097F]/g, '').replace(/\s+/g, ' ').trim();
                if (englishPart.length > 5) englishLines.push(englishPart);
            } else if (hasDevanagari) {
                hindiLines.push(line);
            } else {
                englishLines.push(line);
            }
        });

        let questionEn = englishLines.join(' ').replace(/\s+/g, ' ').trim();
        let questionHi = hindiLines.join(' ').replace(/\s+/g, ' ').trim();

        // Strict English-Hindi Separation
        if (!questionEn && !questionHi) {
            questionEn = `[Question ${q.questionNumber}]`;
            questionHi = '';
        } else if (!questionEn) {
            questionEn = questionHi;
        }

        let expEnLines = [];
        let expHiLines = [];
        q.explanationLines.forEach(line => {
            const hasDevanagari = /[\u0900-\u097F]/.test(line);
            if (hasDevanagari) {
                expHiLines.push(line);
            } else {
                expEnLines.push(line);
            }
        });
        const explanationEn = expEnLines.join(' ').replace(/\s+/g, ' ').trim();
        const explanationHi = expHiLines.join(' ').replace(/\s+/g, ' ').trim();

        const correctIdx = q.correctIndexRef.val >= 0 && q.correctIndexRef.val < rawOptions.length ? q.correctIndexRef.val : -1;
        const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
        const ansLabel = correctIdx !== -1 ? alphabet[correctIdx] : '';

        return {
            questionNumber: typeof q.questionNumber === 'number' ? q.questionNumber : 1,
            question: questionEn,
            question_en: questionEn,
            question_hi: questionHi || '', 
            optionA: rawOptions[0] || '',
            optionB: rawOptions[1] || '',
            optionC: rawOptions[2] || '',
            optionD: rawOptions[3] || '',
            optionE: rawOptions[4] || '',
            optionF: rawOptions[5] || '',
            options: rawOptions,
            options_en: rawOptions,
            options_hi: questionHi ? rawOptions : [], 
            answer: ansLabel,
            correctAnswer: correctIdx !== -1 ? rawOptions[correctIdx] : '',
            correctIndex: correctIdx,
            explanation: explanationEn,
            explanation_hi: explanationHi || '',
            language: questionHi && questionEn ? 'Bilingual' : (questionHi ? 'Hindi' : 'English'),
            image: '',
            type: 'MCQ',
            category: q.category,
            subject: q.subject,
            pageNum: q.pageNum
        };
    });
}

/**
 * Universal PDF Parsing pipeline (Hybrid selectable text + Tesseract.js OCR)
 */
async function parsePDF(pdfBuffer, defaults = {}, expectedCount = 100, onProgress = null) {
    const startTime = Date.now();
    let totalPages = 1;
    let ocrQuestionsCount = 0;
    const logs = [];
    let questions = [];
    const allImages = [];
    
    const defaultCategory = defaults.category || 'General';
    const defaultSubject = defaults.subject || 'General';

    // 1. Load PDF.js document
    if (onProgress) onProgress(10, 'Loading PDF', 'Loading PDF document stream...');
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true
    });
    const doc = await loadingTask.promise;
    totalPages = doc.numPages;
    logs.push(`[Hybrid Parsing] Loaded PDF document. Total pages: ${totalPages}`);

    // 2. Loop through pages to extract sorted column text and images
    let accumulatedText = '';
    for (let pNum = 1; pNum <= totalPages; pNum++) {
        if (onProgress) onProgress(Math.floor(10 + (pNum / totalPages) * 60), `Processing page ${pNum}/${totalPages}`, `Extracting text and images from page ${pNum}...`);
        
        const page = await doc.getPage(pNum);
        const textContent = await page.getTextContent();
        
        // Recover column layout and sort
        const pageRawText = extractTextFromPageItems(textContent.items, page.view[2]);
        
        // Image extraction on page
        const pageImages = await extractImagesFromPage(page, pNum);
        allImages.push(...pageImages);
        
        // Measure selectable text quality
        const quality = assessTextQuality(pageRawText);
        let pageText = '';

        if (quality >= 0.90) {
            pageText = pageRawText;
            logs.push(`Page ${pNum}: Selectable text used (quality ${Math.floor(quality * 100)}%)`);
        } else {
            // OCR fallback
            logs.push(`Page ${pNum}: Low selectable quality (${Math.floor(quality * 100)}%). Running Tesseract.js OCR...`);
            
            try {
                const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for crisp OCR details
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport }).promise;
                const pngBuffer = canvas.toBuffer('image/png');
                
                const ocrResult = await Tesseract.recognize(pngBuffer, 'eng+hin');
                pageText = ocrResult.data.text;
                ocrQuestionsCount++;
                logs.push(`Page ${pNum}: Tesseract.js OCR complete.`);
            } catch (ocrErr) {
                console.error(`[OCR Error] Page ${pNum} failed:`, ocrErr.message);
                logs.push(`Page ${pNum}: OCR failed (${ocrErr.message}). Using fallback selectable text.`);
                pageText = pageRawText;
            }
        }

        // Embed page boundaries for accurate image mapping
        accumulatedText += `\n[PAGE_MARKER_${pNum}]\n` + pageText;
    }

    // 3. Normalize text and tables (Step 4 of pipeline)
    if (onProgress) onProgress(75, 'Normalizing text', 'Cleaning Unicode, CID fonts, and symbols...');
    let cleanText = normalizeText(accumulatedText);
    cleanText = convertTextTablesToHtml(cleanText);

    // 4. Parse layout text into structured questions
    if (onProgress) onProgress(80, 'Parsing questions', 'Splitting questions, options, and boundaries...');
    questions = parseQuestionsHeuristically(cleanText, defaultCategory, defaultSubject);
    logs.push(`[Parser] Extracted ${questions.length} questions from parsed text layout.`);

    // AI Recovery fallback (if regex parsing failed entirely or found extremely few questions)
    const tooFew = questions.length < (expectedCount * 0.4);
    if ((questions.length === 0 || tooFew) && process.env.GEMINI_API_KEY) {
        logs.push(`[AI Recovery] Regex parser extracted only ${questions.length} questions. Running Gemini layout recovery...`);
        if (onProgress) onProgress(85, 'Running AI Recovery', `Regex extracted only ${questions.length} questions. Running Gemini AI layout recovery...`);
        try {
            const aiQuestions = await extractQuestionsFromPdf(pdfBuffer, {
                category: defaultCategory,
                subject: defaultSubject
            });
            const normalized = normalizeAIQuestions(aiQuestions, defaultCategory, defaultSubject);
            if (normalized.length > 0) {
                questions = normalized;
                logs.push(`[AI Recovery] AI Recovery succeeded. Extracted ${questions.length} questions.`);
            }
        } catch (aiErr) {
            console.error('[AI Recovery] Gemini recovery failed:', aiErr.message);
            logs.push(`[AI Recovery] Gemini recovery failed: ${aiErr.message}`);
        }
    }

    // 5. Map page images to questions
    if (onProgress) onProgress(90, 'Mapping images', 'Associating extracted layout images to questions...');
    
    // Save images to disk
    const uploadDir = path.join(__dirname, '../public/uploads/questions');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedImages = [];
    allImages.forEach((img, idx) => {
        const filename = `extracted_${Date.now()}_img_p${img.pageNum}_${idx + 1}.jpg`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, img.buffer);
        savedImages.push({
            url: `/uploads/questions/${filename}`,
            pageNum: img.pageNum
        });
    });
    logs.push(`[Images] Saved ${savedImages.length} extracted images to disk.`);

    // Match page images sequentially for each page
    for (let p = 1; p <= totalPages; p++) {
        const pageImages = savedImages.filter(img => img.pageNum === p);
        const pageQuestions = questions.filter(q => q.pageNum === p);
        
        pageImages.forEach((img, idx) => {
            if (pageQuestions[idx]) {
                pageQuestions[idx].image = img.url;
                logs.push(`[Images] Matched image to Question #${pageQuestions[idx].questionNumber} on page ${p}`);
            }
        });
    }

    // Final cleanups of parsing metadata (delete helper pageNum fields)
    questions = questions.map(q => {
        const { pageNum, ...rest } = q;
        return rest;
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push(`[Job Complete] Parsing completed successfully in ${elapsed}s.`);

    // We store logs directly in return metadata
    questions.parserLogs = logs;
    questions.ocrQuestionsCount = ocrQuestionsCount;
    return questions;
}

/**
 * Cleanup false positive questions by aligning with the highest detected question number
 */
function verifyAndFilterFalsePositives(questions) {
    if (questions.length === 0) return { questions: [], duplicateCount: 0 };

    const highestQNum = Math.max(...questions.map(q => q.questionNumber));
    let duplicateCount = 0;
    
    if (questions.length > highestQNum) {
        const bestQuestionsMap = new Map();
        
        questions.forEach(q => {
            const num = q.questionNumber;
            if (num > highestQNum || num < 1) return;
            
            if (!bestQuestionsMap.has(num)) {
                bestQuestionsMap.set(num, q);
            } else {
                duplicateCount++;
                const existing = bestQuestionsMap.get(num);
                const currentScore = (q.isValid ? 1000 : 0) + (q.question ? q.question.length : 0);
                const existingScore = (existing.isValid ? 1000 : 0) + (existing.question ? existing.question.length : 0);
                if (currentScore > existingScore) {
                    bestQuestionsMap.set(num, q);
                }
            }
        });
        
        let filtered = Array.from(bestQuestionsMap.values());
        filtered.sort((a, b) => a.questionNumber - b.questionNumber);
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

        const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];

        return {
            questionNumber: q.questionNumber || (idx + 1),
            question: q.question || q.question_en || '',
            question_en: q.question_en || q.question || '',
            question_hi: q.question_hi || '', // NEVER copy English to Hindi
            optionA: opts[0] || '',
            optionB: opts[1] || '',
            optionC: opts[2] || '',
            optionD: opts[3] || '',
            optionE: opts[4] || '',
            optionF: opts[5] || '',
            options: opts,
            options_en: opts,
            options_hi: q.question_hi ? optsHi : [], 
            answer: alphabet[correctIdx] || 'A',
            correctAnswer: opts[correctIdx] || q.correctAnswer || '',
            correctIndex: correctIdx,
            explanation: q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            language: q.question_hi && (q.question || q.question_en) ? 'Bilingual' : (q.question_hi ? 'Hindi' : 'English'),
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
