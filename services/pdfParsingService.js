const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

let createCanvas;
try {
    createCanvas = require('canvas').createCanvas;
} catch (err) {
    console.warn('⚠️ WARNING: Failed to load native "canvas" library. Scanned PDF parsing will not work.', err.message);
    createCanvas = function() {
        throw new Error('Native canvas library is not available. Please ensure system dependencies for node-canvas are installed.');
    };
}

const { preprocessPageCanvas } = require('../utils/imagePreprocessor');

/**
 * Maps standard Hindi/English option keys to index
 */
function mapOptionKeyToIndex(key) {
    if (!key) return -1;
    key = key.trim().toUpperCase();
    
    const circleMap = {
        '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5,
        '❶': 0, '❷': 1, '❸': 2, '❹': 3, '❺': 4, '❻': 5
    };
    if (circleMap[key] !== undefined) return circleMap[key];

    const hindiMap = {
        'क': 0, 'ख': 1, 'ग': 2, 'घ': 3, 'ङ': 4,
        'अ': 0, 'ब': 1, 'स': 2, 'द': 3
    };
    if (hindiMap[key] !== undefined) return hindiMap[key];

    if (key >= 'A' && key <= 'F') return key.charCodeAt(0) - 65;
    if (key >= 'a' && key <= 'f') return key.toLowerCase().charCodeAt(0) - 97;

    const num = parseInt(key, 10);
    if (num >= 1 && num <= 6) return num - 1;

    return -1;
}

/**
 * Clean and normalize text strings.
 */
function cleanExtractedText(text) {
    if (!text) return { text: '', promoCount: 0 };
    
    let normalized = text.normalize('NFKC');
    normalized = normalized
        .replace(/ﬁ/g, 'fi')
        .replace(/ﬂ/g, 'fl')
        .replace(/–/g, '-') 
        .replace(/—/g, '-') 
        .replace(/•/g, ' * ') 
        .replace(/[□™©]/g, '') 
        .replace(/[\uE000-\uF8FF\uFFFD]/g, '') 
        .replace(/\u0000/g, '') 
        .replace(/[\u200B-\u200D\uFEFF]/g, ''); 
        
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
    
    const cleanedText = cleanedLines.join('\n');
    return {
        text: cleanedText,
        promoCount: Math.max(0, lines.length - cleanedLines.length)
    };
}

/**
 * Assesses selectable text quality.
 */
function assessTextQuality(text) {
    if (!text || text.trim().length < 50) return 0;
    
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const replacementRatio = replacementCount / text.length;
    
    const letterCount = (text.match(/[a-zA-Z\u0900-\u097F0-9]/g) || []).length;
    const nonWhitespaceCount = text.replace(/\s/g, '').length;
    const letterRatio = letterCount / Math.max(1, nonWhitespaceCount);
    
    if (replacementRatio > 0.05) return 0.4; // High unicode corruption
    if (letterRatio < 0.5) return 0.3;        // Gibberish fonts
    
    return 1.0; 
}

/**
 * Extracts page text items, detects columns/gutters, and preserves layout ordering.
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

    gaps.sort((a, b) => b.width - a.width);

    let colBoundaries = [];
    if (gaps.length >= 1 && gaps[0].width >= 2) {
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

        // Column balance validation
        const totalCount = textItems.length;
        let isBalanced = true;
        for (let colItems of columns) {
            if (colItems.length < totalCount * 0.15 && colItems.length < 10) {
                isBalanced = false;
                break;
            }
        }
        if (!isBalanced) {
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
 * Image Extraction from Page
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
            const img = await Promise.race([
                new Promise((resolve) => {
                    page.objs.get(objId, (o) => resolve(o));
                }),
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), 1500);
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
        // Safe skip
    }
    return images;
}

/**
 * Cloud and Local OCR Handlers
 */
function requestGoogleVisionOCR(base64Image) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GOOGLE_VISION_API_KEY;
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        const payload = JSON.stringify({
            requests: [
                {
                    image: { content: base64Image },
                    features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
                }
            ]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed.responses?.[0]?.fullTextAnnotation?.text || '';
                    resolve(text);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function requestAzureOCR(base64Image) {
    return new Promise((resolve, reject) => {
        const key = process.env.AZURE_OCR_KEY;
        const endpoint = process.env.AZURE_OCR_ENDPOINT.replace(/\/$/, "");
        const url = `${endpoint}/vision/v3.2/read/analyze`;
        const payload = Buffer.from(base64Image, 'base64');

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/octet-stream',
                'Content-Length': payload.length
            }
        }, (res) => {
            const operationLocation = res.headers['operation-location'];
            if (!operationLocation) {
                return reject(new Error('Missing Operation-Location header in Azure OCR response'));
            }

            const pollInterval = setInterval(() => {
                https.get(operationLocation, {
                    headers: { 'Ocp-Apim-Subscription-Key': key }
                }, (pollRes) => {
                    let pollData = '';
                    pollRes.on('data', chunk => pollData += chunk);
                    pollRes.on('end', () => {
                        try {
                            const result = JSON.parse(pollData);
                            if (result.status === 'succeeded') {
                                clearInterval(pollInterval);
                                let text = '';
                                if (result.analyzeResult?.readResults) {
                                    result.analyzeResult.readResults.forEach(page => {
                                        page.lines.forEach(line => {
                                            text += line.text + '\n';
                                        });
                                    });
                                }
                                resolve(text);
                            } else if (result.status === 'failed') {
                                clearInterval(pollInterval);
                                reject(new Error('Azure OCR analysis failed'));
                            }
                        } catch (e) {
                            clearInterval(pollInterval);
                            reject(e);
                        }
                    });
                }).on('error', (err) => {
                    clearInterval(pollInterval);
                    reject(err);
                });
            }, 1000);
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runOCR(pngBuffer, logs) {
    const base64Image = pngBuffer.toString('base64');
    
    if (process.env.GOOGLE_VISION_API_KEY) {
        try {
            logs.push('[OCR] Running Google Vision OCR...');
            const text = await requestGoogleVisionOCR(base64Image);
            if (text && text.trim().length > 20) {
                logs.push('[OCR] Google Vision OCR complete.');
                return text;
            }
        } catch (err) {
            logs.push(`[OCR Warning] Google Vision OCR failed: ${err.message}`);
        }
    }
    
    if (process.env.AZURE_OCR_KEY && process.env.AZURE_OCR_ENDPOINT) {
        try {
            logs.push('[OCR] Running Azure Read API OCR...');
            const text = await requestAzureOCR(base64Image);
            if (text && text.trim().length > 20) {
                logs.push('[OCR] Azure Read API OCR complete.');
                return text;
            }
        } catch (err) {
            logs.push(`[OCR Warning] Azure OCR failed: ${err.message}`);
        }
    }

    logs.push('[OCR] Running local Tesseract.js OCR (eng+hin)...');
    let retryCount = 0;
    while (retryCount < 2) {
        try {
            const ocrResult = await Tesseract.recognize(pngBuffer, 'eng+hin');
            logs.push('[OCR] Tesseract.js OCR complete.');
            return ocrResult.data.text;
        } catch (ocrErr) {
            retryCount++;
            logs.push(`[OCR Warning] Tesseract attempt ${retryCount} failed: ${ocrErr.message}`);
            if (retryCount >= 2) throw ocrErr;
        }
    }
}

/**
 * Structured Output Schema for Gemini to enforce exact JSON formats.
 */
const questionSchema = {
    type: "OBJECT",
    properties: {
        questionNumber: { type: "INTEGER" },
        pageNum: { type: "INTEGER" },
        question: { type: "STRING", description: "Standard English question. If bilingual, extract English here. If only Hindi is present, this should hold the original Hindi." },
        question_en: { type: "STRING", description: "English version. If original is English, keep same. If original is Hindi only, write English translation here." },
        question_hi: { type: "STRING", description: "Hindi version. If original is English only, write Hindi translation here. If mixed, keep original." },
        options: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Exactly 4 options. Same ordering as PDF. If original is English, this should hold English. If original is Hindi only, this should hold Hindi."
        },
        options_en: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Exactly 4 option strings in English."
        },
        options_hi: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Exactly 4 option strings in Hindi."
        },
        correctAnswer: { type: "STRING", description: "The exact string content of the correct option (must match one of the entries in the options array)." },
        correctIndex: { type: "INTEGER", description: "0-based index of correct option (0 to 3)." },
        explanation: { type: "STRING", description: "Detailed explanation in English." },
        explanation_hi: { type: "STRING", description: "Detailed explanation in Hindi." },
        category: { type: "STRING" },
        subject: { type: "STRING" },
        topic: { type: "STRING" },
        difficulty: { type: "STRING", description: "Easy, Medium, or Hard" }
    },
    required: [
        "questionNumber",
        "pageNum",
        "question",
        "options",
        "correctIndex",
        "correctAnswer"
    ]
};

const responseSchema = {
    type: "ARRAY",
    items: questionSchema
};

/**
 * Gemini Question Parser API invocation with automatic retry & fallback.
 */
async function callGeminiBatchParser(parts, defaults, logs) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash for excellent formatting and multi-lingual processing.
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema
        }
    });

    const systemPrompt = `You are a professional exam paper parser. Extract ALL MCQ questions from the provided page segments.
Support bilingual formats (Hindi + English), scanned graphics, math, and sciences.

Guidelines:
1. MATHEMATICAL FORMULAS: Keep formulas inside LaTeX formatting (e.g. $x^2 + y^2 = z^2$, $\\sum_{i=1}^{n}$, \\frac{a}{b}, matrices, chemical structures). Never break or strip math formulas.
2. LANGUAGE: Detect languages automatically. Keep original text (never run automated machine translation on the question or option text, map them directly. If a question is printed in English, options_en and options should have the English text. If in Hindi, options_hi and options should have the Hindi text. If bilingual, fill both).
3. OPTION PARSING: Always extract exactly 4 options. Search the nearby context or next lines if options are truncated. If an option is missing, construct a placeholder but never drop the option entirely.
4. CORRECT ANSWER: Scan carefully for correct answers indicated by checkmarks (✓, ✔), bold letters, circles, highlights, or answer blocks. If no answer indicator is found, default correctIndex to 0 and correctAnswer to the first option, but flag it. Do not guess.
5. JSON SCHEMA: You must return a strict JSON array conforming to the specified schema. Output nothing else.`;

    const promptPart = { text: systemPrompt };
    const contentParts = [promptPart, ...parts];

    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: contentParts }]
            });
            const text = result.response.text().trim();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            throw new Error('Gemini response is not a JSON array.');
        } catch (err) {
            retries--;
            logs.push(`[Gemini Warning] API call failed (retries left: ${retries}): ${err.message}`);
            if (retries === 0) throw err;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2.5;
        }
    }
}

/**
 * Parallel Concurrency Pool Helper.
 */
async function runConcurrentTasks(tasks, limit) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit <= tasks.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

/**
 * Universal PDF Parsing pipeline (Hybrid Selectable text + OCR + Gemini Vision)
 */
async function parsePDF(pdfBuffer, defaults = {}, expectedCount = 100, onProgress = null) {
    const startTime = Date.now();
    const logs = [];
    let questions = [];
    const allImages = [];
    
    const defaultCategory = defaults.category || 'General';
    const defaultSubject = defaults.subject || 'General';

    if (onProgress) onProgress(5, 'Loading PDF', 'Opening PDF document stream...');
    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true
    });
    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;
    logs.push(`[Parser] Loaded PDF document. Total pages: ${totalPages}`);

    // Phase 1: Concurrently extract text, check quality, and run local/API OCR where necessary.
    if (onProgress) onProgress(10, 'Extracting Pages', `Processing ${totalPages} pages in parallel...`);
    
    const parseSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pageImagesDir = path.join(__dirname, '..', 'tmp', 'uploads', 'pages');
    if (!fs.existsSync(pageImagesDir)) {
        fs.mkdirSync(pageImagesDir, { recursive: true });
    }

    // Phase 1: Concurrently extract text, check quality, and run local/API OCR where necessary.
    if (onProgress) onProgress(10, 'Extracting Pages', `Processing ${totalPages} pages in parallel...`);
    
    let completedPages = 0;
    const pageProcessors = Array.from({ length: totalPages }, (_, idx) => async () => {
        const pNum = idx + 1;
        try {
            const page = await doc.getPage(pNum);
            
            // Extract inline images
            const inlineImgs = await extractImagesFromPage(page, pNum);
            allImages.push(...inlineImgs);

            // Extract native text
            const textContent = await page.getTextContent();
            let pageText = extractTextFromPageItems(textContent.items, page.view ? page.view[2] : 595);
            
            const quality = assessTextQuality(pageText);
            
            let result;
            if (quality >= 0.75) {
                // Good selectable text
                result = { pageNum: pNum, text: pageText, type: 'text' };
            } else {
                // Low quality text -> Render and run preprocessor + OCR
                logs.push(`[Parser] Page ${pNum} has low text quality (${quality.toFixed(2)}). Rendering to canvas...`);
                const rotation = page.rotate || 0;
                const viewport = page.getViewport({ scale: 1.5, rotation });
                let canvas = createCanvas(viewport.width, viewport.height);
                let context = canvas.getContext('2d');
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                let preprocessedCanvas = preprocessPageCanvas(canvas);
                const pngBuf = preprocessedCanvas.toBuffer('image/png');

                // Help Garbage Collection clean up large canvas buffers immediately
                canvas = null;
                context = null;
                preprocessedCanvas = null;

                try {
                    const ocrText = await runOCR(pngBuf, logs);
                    if (ocrText && ocrText.trim().length > 50) {
                        result = { pageNum: pNum, text: ocrText, type: 'ocr' };
                    } else {
                        logs.push(`[Parser Info] Page ${pNum} fallback to vision due to short OCR text.`);
                        const pageImageFilename = `page_${parseSessionId}_p${pNum}.png`;
                        const pageImageFilepath = path.join(pageImagesDir, pageImageFilename);
                        fs.writeFileSync(pageImageFilepath, pngBuf);
                        result = { pageNum: pNum, imagePath: pageImageFilepath, text: ocrText || '', type: 'vision' };
                    }
                } catch (ocrErr) {
                    logs.push(`[Parser Warning] Page ${pNum} OCR failed: ${ocrErr.message}`);
                    const pageImageFilename = `page_${parseSessionId}_p${pNum}.png`;
                    const pageImageFilepath = path.join(pageImagesDir, pageImageFilename);
                    fs.writeFileSync(pageImageFilepath, pngBuf);
                    result = { pageNum: pNum, imagePath: pageImageFilepath, text: '', type: 'vision' };
                }
            }

            completedPages++;
            const ocrPct = Math.round((completedPages / totalPages) * 100);
            const overallPct = 10 + Math.round((completedPages / totalPages) * 40); // 10% to 50%
            if (onProgress) {
                onProgress(overallPct, 'Extracting Pages', `Processed page ${completedPages}/${totalPages} (${ocrPct}%)...`);
            }
            return result;
        } catch (err) {
            logs.push(`[Parser Error] Failed to extract page ${pNum}: ${err.message}`);
            completedPages++;
            const ocrPct = Math.round((completedPages / totalPages) * 100);
            const overallPct = 10 + Math.round((completedPages / totalPages) * 40);
            if (onProgress) {
                onProgress(overallPct, 'Extracting Pages', `Processed page ${completedPages}/${totalPages} with errors (${ocrPct}%)...`);
            }
            return { pageNum: pNum, text: `[Error parsing page ${pNum}]`, type: 'text' };
        }
    });

    // Run page extraction with limit of 4 concurrent pages to prevent CPU/RAM starvation.
    const extractedPages = await runConcurrentTasks(pageProcessors, 4);
    logs.push(`[Parser] Page analysis complete. Extracted text & graphics for all ${totalPages} pages.`);

    // Phase 2: Group pages into batches and run Gemini batch parser concurrently.
    const batchSize = 3; 
    const batches = [];
    for (let i = 0; i < extractedPages.length; i += batchSize) {
        batches.push(extractedPages.slice(i, i + batchSize));
    }

    if (onProgress) onProgress(50, 'AI Question Parsing', `Running Gemini AI parsing on ${batches.length} concurrent page batches...`);
    logs.push(`[Parser] Running Gemini batch parser on ${batches.length} parallel batches.`);

    let completedBatchesCount = 0;
    const batchTasks = batches.map((batch, bIdx) => async () => {
        const parts = [];
        batch.forEach(p => {
            if (p.type === 'vision') {
                const imgBuf = fs.readFileSync(p.imagePath);
                parts.push({
                    inlineData: {
                        data: imgBuf.toString('base64'),
                        mimeType: 'image/png'
                    }
                });
                parts.push({ text: `[Page ${p.pageNum} rendered image above]` });
                
                // Clean up page slice image file immediately after generating part
                setTimeout(() => {
                    try {
                        if (fs.existsSync(p.imagePath)) {
                            fs.unlinkSync(p.imagePath);
                        }
                    } catch (err) {}
                }, 30000);
            } else {
                parts.push({ text: `[Page ${p.pageNum} Text content]:\n${p.text}` });
            }
        });

        try {
            const batchQuestions = await callGeminiBatchParser(parts, defaults, logs);
            questions.push(...batchQuestions);
        } catch (err) {
            logs.push(`[Parser Error] Page batch ${bIdx + 1} failed: ${err.message}`);
        }

        completedBatchesCount++;
        const aiPct = 50 + Math.round((completedBatchesCount / batches.length) * 35);
        if (onProgress) {
            onProgress(aiPct, 'AI Question Parsing', `Processed batch ${completedBatchesCount}/${batches.length}...`);
        }
    });

    // Run batch tasks with concurrency of 8 to prevent Gemini rate limit (429) errors.
    await runConcurrentTasks(batchTasks, 8);

    // Fallback if no questions were extracted via Gemini (e.g. because of expired/invalid API key)
    if (questions.length === 0) {
        logs.push('[Parser Fallback] Gemini AI parser yielded 0 questions (possibly due to invalid or expired credentials). Falling back to offline heuristic rule parser...');
        
        let fullText = '';
        extractedPages.forEach(p => {
            if (p.text) {
                fullText += `[PAGE_MARKER_${p.pageNum}]\n` + p.text + '\n\n';
            }
        });
        
        if (fullText.trim().length > 0) {
            try {
                const heuristicQuestions = parseQuestionsHeuristically(fullText, defaultCategory, defaultSubject);
                logs.push(`[Parser Fallback] Local heuristic rule engine successfully extracted ${heuristicQuestions.length} questions.`);
                questions.push(...heuristicQuestions);
            } catch (fallbackErr) {
                logs.push(`[Parser Fallback Error] Local heuristic parser failed: ${fallbackErr.message}`);
            }
        } else {
            logs.push('[Parser Fallback Error] No selectable text or OCR output was found in the document to run heuristic parser.');
        }
    }

    // Save inline images to local questions public upload folder
    if (onProgress) onProgress(85, 'Saving Images', 'Mapping diagrams and graphics to questions...');
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
    logs.push(`[Parser] Extracted and saved ${savedImages.length} inline images to public uploads folder.`);

    // Match page images sequentially for each page
    questions.forEach(q => {
        const pageImages = savedImages.filter(img => img.pageNum === q.pageNum);
        if (pageImages.length > 0) {
            // Pick first unmatched image of the page
            const matchedImg = pageImages.find(img => !img.matched);
            if (matchedImg) {
                q.image = matchedImg.url;
                matchedImg.matched = true;
                logs.push(`[Parser] Matched diagram ${matchedImg.url} to Question #${q.questionNumber} on page ${q.pageNum}`);
            }
        }
    });

    // Phase 3: Strict Normalization, Validation, and Deduplication
    if (onProgress) onProgress(90, 'Validating Questions', 'Validating questions schema structures...');
    
    let validCount = 0;
    let warningCount = 0;
    let missingOptionsCount = 0;
    let missingAnswersCount = 0;
    let encodingErrorsCount = 0;
    const validationErrors = [];

    const normalized = questions.map((q, idx) => {
        const cleanQ = normalizeAIQuestions([q], defaultCategory, defaultSubject)[0];
        
        // Validation Checks
        const errors = [];
        if (!cleanQ.question || cleanQ.question.trim().length <= 15) {
            errors.push('Question text is missing or too short (length <= 15).');
        }
        
        const validOpts = cleanQ.options.filter(o => o && o.trim() !== '');
        if (validOpts.length < 4) {
            errors.push(`Missing valid options (found only ${validOpts.length}, minimum 4 required).`);
            missingOptionsCount++;
        }
        
        if (cleanQ.correctIndex === -1 || !cleanQ.correctAnswer) {
            errors.push('Correct answer is missing or invalid.');
            missingAnswersCount++;
        }

        if (cleanQ.question.includes('\uFFFD') || cleanQ.options.some(o => o && o.includes('\uFFFD'))) {
            errors.push('Question has corrupted unicode characters (\uFFFD).');
            encodingErrorsCount++;
        }

        const isValid = errors.length === 0;
        if (isValid) {
            validCount++;
        } else {
            warningCount++;
            validationErrors.push({
                questionNumber: cleanQ.questionNumber,
                pageNum: cleanQ.pageNum,
                text: cleanQ.question.substring(0, 50) + '...',
                errors
            });
        }

        return {
            ...cleanQ,
            isValid,
            validationWarning: errors.length > 0,
            validationErrors: errors
        };
    });

    // Deduplication check
    const dedupedResult = verifyAndFilterFalsePositives(normalized);
    
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push(`[Job Complete] Parsing completed successfully in ${elapsedSec}s.`);

    // Attach parsed stats and logs to output array
    const finalQuestions = dedupedResult.questions;
    finalQuestions.parserLogs = logs;
    finalQuestions.stats = {
        total: finalQuestions.length,
        valid: validCount,
        warning: warningCount,
        duplicate: dedupedResult.duplicateCount,
        ocr: extractedPages.filter(p => p.type === 'ocr').length,
        vision: extractedPages.filter(p => p.type === 'vision').length,
        encodingErrors: encodingErrorsCount,
        missingOptions: missingOptionsCount,
        missingAnswers: missingAnswersCount,
        timeSec: elapsedSec
    };
    finalQuestions.validationErrors = validationErrors;

    return finalQuestions;
}

/**
 * Question Deduplicator.
 */
function verifyAndFilterFalsePositives(questions) {
    if (questions.length === 0) return { questions: [], duplicateCount: 0 };

    const highestQNum = Math.max(...questions.map(q => q.questionNumber));
    let duplicateCount = 0;
    
    const bestQuestionsMap = new Map();
    questions.forEach(q => {
        const num = q.questionNumber;
        if (num < 1) return;
        
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

/**
 * Normalizes questions schema structures.
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
            pageNum: q.pageNum || 1,
            question: q.question || q.question_en || '',
            question_en: q.question_en || q.question || '',
            question_hi: q.question_hi || '', 
            optionA: opts[0] || '',
            optionB: opts[1] || '',
            optionC: opts[2] || '',
            optionD: opts[3] || '',
            optionE: opts[4] || '',
            optionF: opts[5] || '',
            options: opts.slice(0, 4),
            options_en: (q.options_en || opts).slice(0, 4),
            options_hi: q.question_hi ? optsHi.slice(0, 4) : [], 
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

/**
 * Heuristics fallback parsing engine.
 */
function parseQuestionsHeuristically(text, defaultCategory = 'General', defaultSubject = 'General') {
    // Keeping backward compatibility for test scripts.
    const { cleanExtractedText } = module.exports;
    const cleanRes = cleanExtractedText(text);
    const lines = cleanRes.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const questions = [];
    let currentQ = null;
    let expectedNextNum = 1;
    let currentPageNum = 1;
    
    const qPrefixRegex = /^(?:(?:QUESTION\s+NO\s*\.?|Question|QUESTION|Que|Q|प्र[.]?|प्रश्न\s+संख्या|प्रश्न)\s*[-.:]?\s*([0-9]+)|(?:\[|\()?([0-9]+)(?:\]|\))|([0-9]+)\s*[-.:)\]])\s*(.*)/i;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pageMarker = line.match(/^\[PAGE_MARKER_(\d+)/);
        if (pageMarker) {
            currentPageNum = parseInt(pageMarker[1], 10);
            continue;
        }

        const match = line.match(qPrefixRegex);
        if (match) {
            const rawNum = match[1] || match[2] || match[3];
            const qNum = parseInt(rawNum, 10);
            const rest = match[4] || '';

            if (currentQ) questions.push(currentQ);
            
            currentQ = {
                questionNumber: qNum,
                pageNum: currentPageNum,
                question: rest,
                options: [],
                correctIndex: 0,
                correctAnswer: '',
                category: defaultCategory,
                subject: defaultSubject
            };
            continue;
        }

        if (currentQ) {
            const optMatch = line.match(/^[A-D]\b[-.:)]?\s*(.*)/i);
            if (optMatch) {
                currentQ.options.push(optMatch[1]);
            } else {
                currentQ.question += ' ' + line;
            }
        }
    }
    if (currentQ) questions.push(currentQ);

    return normalizeAIQuestions(questions, defaultCategory, defaultSubject);
}

module.exports = {
    parsePDF,
    cleanExtractedText,
    parseQuestionsHeuristically,
    verifyAndFilterFalsePositives,
    normalizeAIQuestions
};
