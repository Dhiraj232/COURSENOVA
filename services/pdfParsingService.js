const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Polyfill canvas globals for pdfjs-dist rendering on Node
try {
    const canvasLib = require('canvas');
    global.DOMMatrix = canvasLib.DOMMatrix;
    global.DOMPoint = canvasLib.DOMPoint;
} catch (err) {
    console.warn('⚠️ Failed to polyfill canvas globals for PDF parsing:', err.message);
}

// Import sub-modules
const ocrEngine = require('./pdfParser/ocrEngine');
const layoutEngine = require('./pdfParser/layoutEngine');
const pdfAnalyzer = require('./pdfParser/pdfAnalyzer');
const questionDetector = require('./pdfParser/questionDetector');
const optionDetector = require('./pdfParser/optionDetector');
const answerKeyEngine = require('./pdfParser/answerKeyEngine');
const imageEngine = require('./pdfParser/imageEngine');
const formulaEngine = require('./pdfParser/formulaEngine');
const validationEngine = require('./pdfParser/validationEngine');
const autoFixEngine = require('./pdfParser/autoFixEngine');
const importReport = require('./pdfParser/importReport');

let cachedCreateCanvas = null;
function getCreateCanvas() {
    if (cachedCreateCanvas) return cachedCreateCanvas;
    try {
        cachedCreateCanvas = require('canvas').createCanvas;
    } catch (err) {
        console.warn('⚠️ WARNING: Failed to load native "canvas" library. Scanned PDF parsing will not work.', err.message);
        cachedCreateCanvas = function() {
            throw new Error('Native canvas library is not available. Please ensure system dependencies for node-canvas are installed.');
        };
    }
    return cachedCreateCanvas;
}

const { preprocessPageCanvas } = require('../utils/imagePreprocessor');

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
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/μμ/g, 'μ')
        .replace(/ππ/g, 'π')
        .replace(/εε/g, 'ε');
        
    const lines = normalized.split('\n');
    const promoPatterns = [
        /Downloaded\s+from/i, /Cracku/i, /Testbook/i, /Page\s+\d+\s+of\s+\d+/i,
        /Copyright\s+©/i, /www\.\S+/i, /CourseNova/i, /SSC\s+GD\s+Free\s+App/i,
        /Physics\s+Wallah/i, /Adda247/i, /Careerwill/i, /Unacademy/i, /Allen/i, /Aakash/i
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
 * Structured Output Schema for Gemini to enforce exact JSON formats.
 */
const questionSchema = {
    type: "OBJECT",
    properties: {
        questionNumber: { type: "INTEGER" },
        pageNum: { type: "INTEGER" },
        question_en: { type: "STRING" },
        question_hi: { type: "STRING" },
        options_en: { type: "ARRAY", items: { type: "STRING" } },
        options_hi: { type: "ARRAY", items: { type: "STRING" } },
        correctAnswer: { type: "STRING" },
        correctIndex: { type: "INTEGER" },
        explanation: { type: "STRING" },
        explanation_hi: { type: "STRING" },
        category: { type: "STRING" },
        subject: { type: "STRING" },
        topic: { type: "STRING" },
        difficulty: { type: "STRING" },
        marks: { type: "NUMBER" },
        negativeMarks: { type: "NUMBER" },
        hasImage: { type: "BOOLEAN" },
        imageHint: { type: "STRING" }
    },
    required: ["questionNumber", "pageNum", "question_en", "options_en"]
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
    const modelsToTry = ['gemini-1.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-exp'];

    const systemPrompt = `You are a professional exam paper parser. Extract ALL MCQ questions from the provided page segments.
Support bilingual formats (Hindi + English), scanned graphics, math, and sciences.

Guidelines:
1. MATHEMATICAL FORMULAS: Keep formulas inside LaTeX formatting (e.g. $x^2 + y^2 = z^2$, $\\sum_{i=1}^{n}$, \\frac{a}{b}, matrices, chemical structures). Never break or strip math formulas.
2. LANGUAGE: Detect languages automatically. Fill both question_en and question_hi if bilingual. If monolingual, provide translations in the other field.
3. OPTION PARSING: Always extract exactly 4 options. Search the nearby context if options are truncated.
4. CORRECT ANSWER: Scan carefully for correct answers indicated by checkmarks (✓, ✔), bold letters, circles, highlights, or answer blocks. If no answer indicator is found, default correctIndex to 0.
5. JSON SCHEMA: You must return a strict JSON array of question objects. Output ONLY raw JSON array. Do not include markdown code block syntax.`;

    const promptPart = { text: systemPrompt };
    const contentParts = [promptPart, ...parts];

    for (let modelName of modelsToTry) {
        let retries = 2;
        while (retries > 0) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                });

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: contentParts }]
                });
                let text = result.response.text().trim();
                if (text.startsWith('```')) {
                    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
                }
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
                if (Array.isArray(parsed)) return parsed;
            } catch (err) {
                const msg = err.message || '';
                const isAuthError = msg.includes('401') || msg.includes('Unauthorized') || msg.includes('API key') || msg.includes('invalid credentials');
                if (isAuthError) {
                    logs.push(`[Gemini Auth Error] Invalid or expired credentials: ${err.message}. Skipping retries.`);
                    throw err;
                }
                retries--;
                logs.push(`[Gemini Warning] Model ${modelName} call failed (retries left: ${retries}): ${err.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    return [];
}

/**
 * Gemini Answer Key & Solution Parser API invocation
 */
async function callGeminiAnswerKeyParser(parts, logs) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: "OBJECT",
                properties: {
                    answers: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                questionNumber: { type: "INTEGER" },
                                correctAnswer: { type: "STRING" },
                                correctIndex: { type: "INTEGER" },
                                explanation: { type: "STRING" },
                                explanation_hi: { type: "STRING" }
                            },
                            required: ["questionNumber"]
                        }
                    }
                },
                required: ["answers"]
            }
        }
    });

    const systemPrompt = `You are a professional answer key and solutions parser.
Extract the correct answers, indices (0-based: 0 for A, 1 for B, 2 for C, 3 for D), and detailed explanations for all questions from the text or images.
Output a valid JSON object matching the required schema. Output nothing else.`;

    const promptPart = { text: systemPrompt };
    const contentParts = [promptPart, ...parts];

    let retries = 5;
    let delay = 2000;
    while (retries > 0) {
        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: contentParts }]
            });
            const text = result.response.text().trim();
            const parsed = JSON.parse(text);
            if (parsed && Array.isArray(parsed.answers)) {
                return parsed.answers;
            }
            throw new Error('Gemini Answer Key response is not a valid object schema.');
        } catch (err) {
            const msg = err.message || '';
            const isAuthError = msg.includes('401') || msg.includes('Unauthorized') || msg.includes('API key') || msg.includes('invalid credentials');
            if (isAuthError) {
                logs.push(`[Gemini Auth Error] Invalid or expired credentials: ${err.message}. Skipping retries.`);
                throw err;
            }
            retries--;
            logs.push(`[Answer Key Parser Warning] Retries left: ${retries}, error: ${err.message}`);
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
 * Universal PDF Parsing pipeline (Orchestrated Modular Pipeline)
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

    const parseSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const pageImagesDir = path.join(__dirname, '..', 'tmp', 'uploads', 'pages');
    if (!fs.existsSync(pageImagesDir)) {
        fs.mkdirSync(pageImagesDir, { recursive: true });
    }

    // Module 1 & 2: PDF Analyzer & Layout Separation
    if (onProgress) onProgress(10, 'Analyzing Layout Sections', `Scanning document sections...`);
    let answerKeyStartPage = -1;
    const pageInfos = [];
    
    const classificationTasks = Array.from({ length: totalPages }, (_, idx) => async () => {
        const pNum = idx + 1;
        try {
            const page = await doc.getPage(pNum);
            const textContent = await page.getTextContent();
            
            // Extract raw text through Layout Engine
            const layoutResult = layoutEngine.extractTextFromPageItems(
                textContent.items, 
                page.view ? page.view[2] : 595, 
                page.view ? page.view[3] : 842
            );
            
            // Run PDF Analyzer on page content
            const analysis = pdfAnalyzer.analyzePage(page, layoutResult.text, pNum);
            pageInfos.push(analysis);

            // Scan answers keywords and layout structure
            if (answerKeyEngine.isAnswerKeySectionStart(layoutResult.text)) {
                return { pageNum: pNum, isAnswerKey: true };
            }
        } catch (err) {}
        return { pageNum: pNum, isAnswerKey: false };
    });

    const pageClassifications = await runConcurrentTasks(classificationTasks, 10);
    
    // Sort and analyze overall doc type
    const answerKeyPagesList = pageClassifications.filter(c => c.isAnswerKey);
    if (answerKeyPagesList.length > 0) {
        answerKeyPagesList.sort((a, b) => a.pageNum - b.pageNum);
        answerKeyStartPage = answerKeyPagesList[0].pageNum;
        logs.push(`[Parser Section] Detected Answer Key/Solutions section starting on Page ${answerKeyStartPage}`);
    } else {
        logs.push(`[Parser Section] No explicit Answer Key section found; processing all pages as questions.`);
    }

    const docTypeAnalysis = pdfAnalyzer.analyzeDocument(pageInfos);
    logs.push(`[Parser Analyzer] Detected PDF Type: ${docTypeAnalysis.type}, Language: ${docTypeAnalysis.language}`);

    // Phase 1: Concurrently extract text, check quality, and run local/API OCR where necessary.
    if (onProgress) onProgress(15, 'Extracting Pages', `Processing ${totalPages} pages in parallel...`);
    
    let completedPages = 0;
    const pageProcessors = Array.from({ length: totalPages }, (_, idx) => async () => {
        const pNum = idx + 1;
        try {
            const page = await doc.getPage(pNum);
            
            // Extract inline images
            const inlineImgs = await imageEngine.extractImagesFromPage(page, pNum);
            allImages.push(...inlineImgs);

            // Extract text through Layout Engine
            const textContent = await page.getTextContent();
            const layoutResult = layoutEngine.extractTextFromPageItems(
                textContent.items, 
                page.view ? page.view[2] : 595, 
                page.view ? page.view[3] : 842
            );
            
            let pageText = layoutResult.text;
            const cleanRes = cleanExtractedText(pageText);
            pageText = cleanRes.text;

            const quality = ocrEngine.assessTextQuality(pageText);
            let result;
            
            // Check if the subject or category is Math/Physics/Chemistry, or the text contains math indicators.
            // If so, we FORCE page rendering to vision mode, passing the image to Gemini to reconstruct complex equations/graphics.
            const isMathOrScience = /math|phys|chem|jee|neet|science/i.test(`${defaults.category || ''} ${defaults.subject || ''}`);
            const hasMathSymbols = /[\u2200-\u22FF\u2190-\u21FF√∛∫∬∑πθ∞≤≥≈≠±×÷→]/.test(pageText) || /\b(vector|matrix|integral|fraction|limit|determinant|equation)\b/i.test(pageText);
            const forceVision = isMathOrScience || hasMathSymbols;
            
            // Native text clean switch: don't run OCR if native text is clean (>95%) and not a math/science layout
            if (quality >= 0.95 && pageText.trim().length > 50 && !forceVision) {
                result = { pageNum: pNum, text: pageText, type: 'text', layoutType: layoutResult.layoutType };
            } else {
                logs.push(`[Parser] Page ${pNum} has low text quality (${quality.toFixed(2)}). Rendering to image...`);
                const rotation = page.rotate || 0;
                const viewport = page.getViewport({ scale: 2.0, rotation });
                let canvas = getCreateCanvas()(viewport.width, viewport.height);
                let context = canvas.getContext('2d');
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                let preprocessedCanvas = preprocessPageCanvas(canvas);
                const pngBuf = preprocessedCanvas.toBuffer('image/png');

                canvas = null;
                context = null;
                preprocessedCanvas = null;

                try {
                    const pageImageFilename = `page_${parseSessionId}_p${pNum}.png`;
                    const pageImageFilepath = path.join(pageImagesDir, pageImageFilename);
                    fs.writeFileSync(pageImageFilepath, pngBuf);
                    
                    const ocrText = await ocrEngine.runOCR(pngBuf, logs);
                    const cleanOcr = cleanExtractedText(ocrText);
                    result = { 
                        pageNum: pNum, 
                        imagePath: pageImageFilepath, 
                        text: cleanOcr.text || '', 
                        type: 'vision',
                        layoutType: 'Scanned Image Layout'
                    };
                } catch (ocrErr) {
                    logs.push(`[Parser Warning] Page ${pNum} OCR failed: ${ocrErr.message}`);
                    const pageImageFilename = `page_${parseSessionId}_p${pNum}.png`;
                    const pageImageFilepath = path.join(pageImagesDir, pageImageFilename);
                    fs.writeFileSync(pageImageFilepath, pngBuf);
                    result = { pageNum: pNum, imagePath: pageImageFilepath, text: '', type: 'vision', layoutType: 'Scanned Image Layout' };
                }
            }

            completedPages++;
            const ocrPct = Math.round((completedPages / totalPages) * 100);
            const overallPct = 15 + Math.round((completedPages / totalPages) * 35);
            if (onProgress) {
                onProgress(overallPct, 'Extracting Pages', `Processed page ${completedPages}/${totalPages} (${ocrPct}%)...`);
            }
            return result;
        } catch (err) {
            logs.push(`[Parser Error] Failed to extract page ${pNum}: ${err.message}`);
            completedPages++;
            const ocrPct = Math.round((completedPages / totalPages) * 100);
            const overallPct = 15 + Math.round((completedPages / totalPages) * 35);
            if (onProgress) {
                onProgress(overallPct, 'Extracting Pages', `Processed page ${completedPages}/${totalPages} with errors (${ocrPct}%)...`);
            }
            return { pageNum: pNum, text: `[Error parsing page ${pNum}]`, type: 'text', layoutType: 'Unknown' };
        }
    });

    const extractedPages = await runConcurrentTasks(pageProcessors, 4);
    console.log('[Stage 2: OCR Complete]');
    logs.push(`[Parser] Page analysis complete. Extracted text & graphics for all ${totalPages} pages.`);

    // Split pages into Question pages and Answer pages
    let questionExtractedPages = answerKeyStartPage > 0 
        ? extractedPages.filter(p => p.pageNum < answerKeyStartPage) 
        : extractedPages;
        
    // Filter out cover/instruction pages from question pages
    questionExtractedPages = questionExtractedPages.filter(p => {
        if (pdfAnalyzer.isInstructionPage && pdfAnalyzer.isInstructionPage(p.text, p.pageNum)) {
            logs.push(`[Parser Section] Skipped Cover/Instruction Page ${p.pageNum}`);
            return false;
        }
        return true;
    });
        
    const answerKeyExtractedPages = answerKeyStartPage > 0 
        ? extractedPages.filter(p => p.pageNum >= answerKeyStartPage) 
        : [];

    // Phase 2: Group Question Pages into batches and run Gemini batch parser concurrently.
    const batchSize = 3; 
    const questionBatches = [];
    for (let i = 0; i < questionExtractedPages.length; i += batchSize) {
        questionBatches.push(questionExtractedPages.slice(i, i + batchSize));
    }

    if (onProgress) onProgress(50, 'AI Question Parsing', `Running Gemini AI parsing on ${questionBatches.length} concurrent page batches...`);
    logs.push(`[Parser] Running Gemini batch parser on ${questionBatches.length} parallel batches.`);

    let completedBatchesCount = 0;
    const batchTasks = questionBatches.map((batch, bIdx) => async () => {
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
                if (p.text) {
                    parts.push({ text: `[Page ${p.pageNum} Helper OCR Text]:\n${p.text}` });
                }
                
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
        const aiPct = 50 + Math.round((completedBatchesCount / questionBatches.length) * 25);
        if (onProgress) {
            onProgress(aiPct, 'AI Question Parsing', `Processed batch ${completedBatchesCount}/${questionBatches.length}...`);
        }
    });

    await runConcurrentTasks(batchTasks, 2);
    console.log('[Stage 3: AI Parsing Complete]');

    // Phase 2.5: Parse Answer Key / Solution Pages if available
    let parsedAnswers = [];
    if (answerKeyExtractedPages.length > 0) {
        if (onProgress) onProgress(75, 'AI Answer Key Parsing', `Extracting answers and detailed solutions...`);
        logs.push(`[Parser] Running Gemini answer key parser on ${answerKeyExtractedPages.length} pages.`);
        
        const answerParts = [];
        answerKeyExtractedPages.forEach(p => {
            if (p.type === 'vision') {
                const imgBuf = fs.readFileSync(p.imagePath);
                answerParts.push({
                    inlineData: {
                        data: imgBuf.toString('base64'),
                        mimeType: 'image/png'
                    }
                });
                answerParts.push({ text: `[Answer Page ${p.pageNum} rendered image above]` });
                if (p.text) {
                    answerParts.push({ text: `[Answer Page ${p.pageNum} Helper OCR Text]:\n${p.text}` });
                }
                
                setTimeout(() => {
                    try {
                        if (fs.existsSync(p.imagePath)) {
                            fs.unlinkSync(p.imagePath);
                        }
                    } catch (err) {}
                }, 30000);
            } else {
                answerParts.push({ text: `[Answer Page ${p.pageNum} Text content]:\n${p.text}` });
            }
        });

        try {
            const extractedAnswers = await callGeminiAnswerKeyParser(answerParts, logs);
            parsedAnswers = extractedAnswers;
            logs.push(`[Parser Section] Extracted correct answers and solutions mapping for ${parsedAnswers.length} questions.`);
        } catch (err) {
            logs.push(`[Parser Error] Failed to parse Answer Key: ${err.message}`);
        }
    }

    // Correlation Phase: Map parsed Answer Key & solutions back to the questions
    const answerMap = new Map();
    parsedAnswers.forEach(ans => {
        answerMap.set(ans.questionNumber, ans);
    });

    if (questions.length > 0 && answerMap.size > 0) {
        logs.push(`[Parser Section] Correlating Answer Key with parsed questions...`);
        questions.forEach(q => {
            const matchAns = answerMap.get(q.questionNumber);
            if (matchAns) {
                if (matchAns.correctIndex !== undefined && matchAns.correctIndex >= 0) {
                    q.correctIndex = matchAns.correctIndex;
                    q.correctAnswer = q.options_en?.[matchAns.correctIndex] || q.correctAnswer;
                } else if (matchAns.correctAnswer) {
                    const mappedIdx = answerKeyEngine.mapOptionToIndex(matchAns.correctAnswer);
                    if (mappedIdx >= 0) {
                        q.correctIndex = mappedIdx;
                        q.correctAnswer = q.options_en?.[mappedIdx] || matchAns.correctAnswer;
                    } else {
                        q.correctAnswer = matchAns.correctAnswer;
                    }
                }
                if (matchAns.explanation) {
                    q.explanation = matchAns.explanation;
                }
                if (matchAns.explanation_hi) {
                    q.explanation_hi = matchAns.explanation_hi;
                }
            }
        });
    }

    // Fallback Phase 1: Local Heuristic Parser on extracted text if Gemini AI parser yielded 0 questions
    if (questions.length === 0) {
        logs.push('[Parser Fallback Stage 1] Gemini AI parser yielded 0 questions or failed. Falling back to offline heuristic rule parser...');
        
        let fullText = '';
        questionExtractedPages.forEach(p => {
            if (p.text) {
                fullText += `[PAGE_MARKER_${p.pageNum}]\n` + p.text + '\n\n';
            }
        });
        
        if (fullText.trim().length > 0) {
            try {
                const heuristicQuestions = parseQuestionsHeuristically(fullText, defaultCategory, defaultSubject);
                logs.push(`[Parser Fallback Stage 1] Local heuristic rule engine extracted ${heuristicQuestions.length} questions from native text.`);
                questions.push(...heuristicQuestions);
            } catch (fallbackErr) {
                logs.push(`[Parser Fallback Stage 1 Error] Local heuristic parser failed: ${fallbackErr.message}`);
            }
        }
    }

    // Fallback Phase 2: If questions are STILL 0, force OCR rendering on ALL pages and run Heuristic Parser again
    if (questions.length === 0) {
        logs.push('[Parser Fallback Stage 2] 0 questions found so far. Force-rendering ALL pages to high-resolution images for full OCR scan...');
        
        let ocrFullText = '';
        for (const p of questionExtractedPages) {
            try {
                const page = await doc.getPage(p.pageNum);
                const rotation = page.rotate || 0;
                const viewport = page.getViewport({ scale: 2.0, rotation });
                let canvas = getCreateCanvas()(viewport.width, viewport.height);
                let context = canvas.getContext('2d');
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                let preprocessedCanvas = preprocessPageCanvas(canvas);
                const pngBuf = preprocessedCanvas.toBuffer('image/png');
                
                const pageText = await ocrEngine.runOCR(pngBuf, logs);
                if (pageText && pageText.trim().length > 0) {
                    ocrFullText += `[PAGE_MARKER_${p.pageNum}]\n` + pageText + '\n\n';
                }
            } catch (forceOcrErr) {
                logs.push(`[Parser Fallback Stage 2 Warning] Force OCR failed on Page ${p.pageNum}: ${forceOcrErr.message}`);
            }
        }

        if (ocrFullText.trim().length > 0) {
            try {
                const ocrHeuristicQuestions = parseQuestionsHeuristically(ocrFullText, defaultCategory, defaultSubject);
                logs.push(`[Parser Fallback Stage 2] Full OCR Heuristic engine extracted ${ocrHeuristicQuestions.length} questions.`);
                questions.push(...ocrHeuristicQuestions);
            } catch (ocrHeuristicErr) {
                logs.push(`[Parser Fallback Stage 2 Error] Full OCR Heuristic parser failed: ${ocrHeuristicErr.message}`);
            }
        }
    }

    // Stage 8 & 9: Surgical Bounding-Box OCR & AI Recovery for incomplete questions
    let incompleteQuestions = questions.filter(q => {
        const validOpts = (q.options || q.options_en || []).filter(o => o && o.toString().trim().length > 0);
        return validOpts.length < 2 || !q.question || q.question.trim().length < 5;
    });

    if (incompleteQuestions.length > 0) {
        logs.push(`[Parser Stage 8 & 9] Found ${incompleteQuestions.length} incomplete questions. Attempting surgical bounding-box recovery...`);
        for (let q of incompleteQuestions) {
            try {
                // Auto-repair options using autoFixEngine first
                const repaired = autoFixEngine.autoFixQuestion(q);
                const repairedOpts = (repaired.options || []).filter(o => o && o.toString().trim().length > 0);
                if (repairedOpts.length >= 2) {
                    Object.assign(q, repaired);
                    logs.push(`[Parser Recovery] Auto-repaired inline options for Question #${q.questionNumber}`);
                    continue;
                }
            } catch (recoveryErr) {}
        }
    }

    // Save inline images to local public questions folder
    if (onProgress) onProgress(85, 'Saving Images', 'Mapping diagrams and graphics to questions...');
    const uploadDir = path.join(__dirname, '../public/uploads/questions');
    const savedImages = imageEngine.saveExtractedImages(allImages, uploadDir);
    logs.push(`[Parser] Extracted and saved ${savedImages.length} inline images to public uploads folder.`);

    // Match page images sequentially and by visual hints to each page's questions
    questions = imageEngine.correlateImagesToQuestions(questions, savedImages, logs);
    console.log('[Stage 4: Questions Parsed]');

    // Phase 3: Strict Normalization, Validation, Auto-Fix, and Deduplication
    if (onProgress) onProgress(90, 'Validating Questions', 'Validating questions schema structures...');
    
    let validCount = 0;
    let warningCount = 0;
    let missingOptionsCount = 0;
    let missingAnswersCount = 0;
    let encodingErrorsCount = 0;
    const validationErrors = [];

    const normalized = questions.map((q, idx) => {
        // Run AI Auto Fix Engine
        const fixedQ = autoFixEngine.autoFixQuestion(q);
        
        // Clean math formulas through Formula Engine
        if (fixedQ.question_en) fixedQ.question_en = formulaEngine.formatAndWrapLaTeX(fixedQ.question_en);
        if (fixedQ.question_hi) fixedQ.question_hi = formulaEngine.formatAndWrapLaTeX(fixedQ.question_hi);
        if (Array.isArray(fixedQ.options_en)) {
            fixedQ.options_en = fixedQ.options_en.map(o => formulaEngine.formatAndWrapLaTeX(o));
        }
        if (Array.isArray(fixedQ.options_hi)) {
            fixedQ.options_hi = fixedQ.options_hi.map(o => formulaEngine.formatAndWrapLaTeX(o));
        }

        const cleanQ = normalizeAIQuestions([fixedQ], defaultCategory, defaultSubject)[0];
        
        // Run Validation Engine
        const valRes = validationEngine.validateQuestion(cleanQ);
        const isValid = valRes.isValid;
        
        if (isValid) {
            validCount++;
        } else {
            warningCount++;
            validationErrors.push({
                questionNumber: cleanQ.questionNumber,
                pageNum: cleanQ.pageNum,
                text: (cleanQ.question || '').substring(0, 50) + '...',
                errors: valRes.errors
            });
            
            // Increment category errors count
            valRes.errors.forEach(err => {
                if (err.includes('options')) missingOptionsCount++;
                if (err.includes('answer')) missingAnswersCount++;
                if (err.includes('Unicode')) encodingErrorsCount++;
            });
        }

        return {
            ...cleanQ,
            isValid,
            validationWarning: !isValid,
            validationErrors: valRes.errors
        };
    });

    // Deduplication check
    const dedupedResult = verifyAndFilterFalsePositives(normalized);
    const finalQuestions = dedupedResult.questions;
    
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push(`[Job Complete] Parsing completed in ${elapsedSec}s. Extracted: ${finalQuestions.length} questions.`);

    // If zero questions extracted after ALL parsers ran, build detailed diagnostic report
    if (finalQuestions.length === 0) {
        let totalNativeLen = 0;
        questionExtractedPages.forEach(p => { totalNativeLen += (p.text || '').length; });

        finalQuestions.diagnostics = {
            parsersAttempted: ['Native Text Extractor', 'OCR Engine', 'Gemini AI Batch Parser', 'Local Heuristic Rule Engine', 'Full Page Force OCR Engine'],
            totalPages: totalPages,
            nativeTextExtractedLength: totalNativeLen,
            ocrPagesRun: extractedPages.filter(p => p.type === 'vision' || p.type === 'ocr').length,
            aiParserStatus: process.env.GEMINI_API_KEY ? 'Enabled' : 'Disabled (GEMINI_API_KEY missing)',
            failureReason: totalNativeLen === 0 
                ? 'PDF contains no readable text stream or graphics that could be decoded by OCR.' 
                : 'Text was extracted from PDF, but no standard MCQ question numbering patterns or option structures were detected.',
            logsSnippet: logs.slice(-10)
        };
        logs.push(`[Parser Diagnostic Alert] 0 questions extracted. Diagnostics: ${JSON.stringify(finalQuestions.diagnostics)}`);
    }

    // Attach parsed stats and logs to output array
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
    console.log('[Stage 5: Questions Validated]');

    // Run Import Report Generator
    const reportData = importReport.generateReport(
        finalQuestions, 
        logs, 
        {
            total: finalQuestions.length,
            valid: validCount,
            warning: warningCount,
            duplicate: dedupedResult.duplicateCount,
            ocr: extractedPages.filter(p => p.type === 'ocr').length,
            vision: extractedPages.filter(p => p.type === 'vision').length,
            imagesCount: savedImages.length,
            skippedPages: extractedPages.filter(p => p.text.includes('[Error parsing page')).length
        },
        validationErrors
    );

    // Map properties directly to the array object as expected by adminRoutes.js
    finalQuestions.importReport = reportData.report;

    return finalQuestions;
}

function isSimilarQuestion(q1, q2) {
    if (!q1.question || !q2.question) return false;
    const clean = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s1 = clean(q1.question);
    const s2 = clean(q2.question);
    if (s1 === s2) return true;
    
    // Check if one is a long substring of another or word overlap
    const words1 = new Set(q1.question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(q2.question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return false;
    
    let intersection = 0;
    words1.forEach(w => {
        if (words2.has(w)) intersection++;
    });
    const overlap = intersection / Math.min(words1.size, words2.size);
    return overlap > 0.70; // 70% word overlap means they are duplicate versions of the same question
}

/**
 * Question Deduplicator. Keeps best quality version of actual duplicates.
 */
function verifyAndFilterFalsePositives(questions) {
    if (!Array.isArray(questions) || questions.length === 0) return { questions: [], duplicateCount: 0 };

    let duplicateCount = 0;
    const uniqueQuestions = [];
    
    questions.forEach((q, index) => {
        if (!q) return;
        if (typeof q.questionNumber !== 'number' || isNaN(q.questionNumber) || q.questionNumber < 1) {
            q.questionNumber = index + 1;
        }
        
        // Find if there is an existing question with high text similarity
        const duplicateIdx = uniqueQuestions.findIndex(existing => 
            isSimilarQuestion(existing, q)
        );
        
        if (duplicateIdx === -1) {
            uniqueQuestions.push(q);
        } else {
            duplicateCount++;
            const existing = uniqueQuestions[duplicateIdx];
            const currentScore = (q.isValid ? 1000 : 0) + (q.options ? q.options.filter(Boolean).length * 100 : 0) + (q.question ? q.question.length : 0);
            const existingScore = (existing.isValid ? 1000 : 0) + (existing.options ? existing.options.filter(Boolean).length * 100 : 0) + (existing.question ? existing.question.length : 0);
            if (currentScore > existingScore) {
                uniqueQuestions[duplicateIdx] = q;
            }
        }
    });
    
    uniqueQuestions.sort((a, b) => {
        if (a.pageNum && b.pageNum && a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
        return a.questionNumber - b.questionNumber;
    });
    
    // Re-assign clean sequential questionNumbers (1..N) to prevent duplicates
    uniqueQuestions.forEach((q, idx) => {
        q.questionNumber = idx + 1;
    });

    return { questions: uniqueQuestions, duplicateCount };
}

/**
 * Splits a bilingual text into separate English and Hindi components.
 */
function splitBilingualQuestion(text) {
    if (!text) return { en: '', hi: '' };
    
    // Match English text followed by Hindi text (Devanagari range)
    const transitionMatch = text.match(/^([a-zA-Z0-9\s.,()\-+*\/=?'"’‘“”$®™:#%;<>_\\{}]+)\s*([\u0900-\u097F].*)$/);
    if (transitionMatch) {
        return {
            en: transitionMatch[1].trim(),
            hi: transitionMatch[2].trim()
        };
    }
    
    if (/[\u0900-\u097F]/.test(text) && !/[a-zA-Z]/.test(text)) {
        return { en: '', hi: text.trim() };
    }
    
    return { en: text.trim(), hi: '' };
}

/**
 * Normalizes questions schema structures.
 */
function normalizeAIQuestions(aiQuestions, defaultCategory, defaultSubject) {
    if (!Array.isArray(aiQuestions)) return [];
    
    return aiQuestions.map((q, idx) => {
        const opts = q.options || q.options_en || [];
        const optsHi = q.options_hi && q.options_hi.some(o => o) ? q.options_hi : opts;

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

        const finalOptions = optionDetector.normalizeOptionsList(opts);
        const finalOptionsEn = optionDetector.normalizeOptionsList(q.options_en || opts);
        const finalOptionsHi = optionDetector.normalizeOptionsList(q.options_hi || optsHi);

        let questionEn = q.question_en || '';
        let questionHi = q.question_hi || '';
        if (!questionEn && !questionHi && q.question) {
            const split = splitBilingualQuestion(q.question);
            questionEn = split.en;
            questionHi = split.hi;
        } else if (!questionEn && q.question) {
            questionEn = q.question;
        }

        return {
            // Database-Compatible fields
            questionNumber: q.questionNumber || (idx + 1),
            pageNum: q.pageNum || 1,
            question: questionEn || questionHi,
            question_en: questionEn,
            question_hi: questionHi, 
            optionA: finalOptions[0],
            optionB: finalOptions[1],
            optionC: finalOptions[2],
            optionD: finalOptions[3],
            optionE: opts[4] || '',
            optionF: opts[5] || '',
            options: finalOptions,
            options_en: finalOptionsEn,
            options_hi: questionHi ? finalOptionsHi : [], 
            answer: alphabet[correctIdx] || 'A',
            correctAnswer: finalOptions[correctIdx] || q.correctAnswer || '',
            correctIndex: correctIdx,
            explanation: q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            language: questionHi && questionEn ? 'Bilingual' : (questionHi ? 'Hindi' : 'English'),
            image: q.image || '',
            type: 'MCQ',
            category: q.category || defaultCategory,
            subject: q.subject || defaultSubject,

            // Spec-required fields
            questionEnglish: questionEn,
            questionHindi: questionHi,
            solution: q.explanation || '',
            images: q.image ? [q.image] : [],
            page: q.pageNum || 1,
            chapter: q.category || defaultCategory,
            topic: q.topic || '',
            difficulty: q.difficulty || 'Medium',
            marks: q.marks || 1,
            negativeMarks: q.negativeMarks || -0.25
        };
    });
}

/**
 * Pre-splits text lines containing embedded question number boundaries or inline option blocks
 */
function preprocessAndSplitTextLines(rawText) {
    if (!rawText) return [];
    const initialLines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const splitLines = [];

    initialLines.forEach(line => {
        if (line.startsWith('[PAGE_MARKER_')) {
            splitLines.push(line);
            return;
        }

        // Split embedded question starts in the middle of sentences (e.g. "...idea. 30. They tried to...")
        let currentLine = line;
        const embeddedQRegex = /(^|[\.\?\!]\s+)(?:(?:Q|Question|Que|प्र[.]?|प्रश्न)\s*[-.:]?\s*)?(\d{1,4})[\.\)]\s+([A-Z\u0900-\u097F].*)$/;
        
        let loopLimit = 5;
        let match = currentLine.match(embeddedQRegex);
        while (match && loopLimit > 0) {
            const matchIndex = match.index + match[1].length;
            const linePart1 = currentLine.substring(0, matchIndex).trim();
            const linePart2 = currentLine.substring(matchIndex).trim();

            if (linePart1.length > 0) {
                splitLines.push(linePart1);
            }
            currentLine = linePart2;
            loopLimit--;
            match = currentLine.match(embeddedQRegex);
        }

        if (currentLine.length > 0) {
            // Split inline multi-option blocks (e.g. "(A) farther (B) further (C) far (D) away")
            const inlineOptMatch = currentLine.match(/^(.*?)\s+([\(\[]?[A-Da-d1-4क-घ][\)\].]?\s+.*[\(\[]?[B-Db-d2-4ख-घ][\)\].]?\s+.*)$/);
            if (inlineOptMatch && inlineOptMatch[1].trim().length > 5) {
                splitLines.push(inlineOptMatch[1].trim());
                splitLines.push(inlineOptMatch[2].trim());
            } else {
                splitLines.push(currentLine);
            }
        }
    });

    return splitLines;
}

/**
 * Heuristics fallback parsing engine.
 */
function parseQuestionsHeuristically(text, defaultCategory = 'General', defaultSubject = 'General') {
    const cleanRes = cleanExtractedText(text);
    const lines = preprocessAndSplitTextLines(cleanRes.text);
    
    // Scan if the text contains strong question prefixes
    const strongPrefixRegex = /^\s*(?:QUESTION\s+NO\s*\.?|Question|QUESTION|Que|Q|प्र[.]?|प्रश्न\s+संख्या|प्रश्न)\s*[-.:]?\s*[0-9]+/i;
    let usesStrongPrefix = false;
    for (let line of lines) {
        if (strongPrefixRegex.test(line)) {
            usesStrongPrefix = true;
            break;
        }
    }
    
    const rawQuestions = [];
    let currentQ = null;
    let currentPageNum = 1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pageMarker = line.match(/^\[PAGE_MARKER_(\d+)/);
        if (pageMarker) {
            currentPageNum = parseInt(pageMarker[1], 10);
            continue;
        }

        const match = questionDetector.detectQuestionPrefix(line, usesStrongPrefix);
        if (match) {
            if (currentQ) rawQuestions.push(currentQ);
            
            const isHindiText = /[\u0900-\u097F]/.test(match.remainingText);
            currentQ = {
                questionNumber: match.questionNumber,
                pageNum: currentPageNum,
                question: match.remainingText,
                question_en: isHindiText ? '' : match.remainingText,
                question_hi: isHindiText ? match.remainingText : '',
                options: [],
                options_en: [],
                options_hi: [],
                correctIndex: 0,
                correctAnswer: '',
                category: defaultCategory,
                subject: defaultSubject
            };
            continue;
        }

        if (currentQ) {
            const optMatch = optionDetector.detectOptionPrefix(line);
            if (optMatch) {
                if (!Array.isArray(currentQ.options)) currentQ.options = [];
                while (currentQ.options.length < 4) currentQ.options.push('');
                if (!Array.isArray(currentQ.options_hi)) currentQ.options_hi = [];
                while (currentQ.options_hi.length < 4) currentQ.options_hi.push('');
                if (!Array.isArray(currentQ.options_en)) currentQ.options_en = [];
                while (currentQ.options_en.length < 4) currentQ.options_en.push('');
                
                const optIdx = optMatch.index >= 0 ? optMatch.index : answerKeyEngine.mapOptionToIndex(optMatch.label);
                const contentText = optMatch.content || optMatch.label;
                const isHindiOpt = /[\u0900-\u097F]/.test(contentText);
                if (optIdx >= 0 && optIdx < 4) {
                    currentQ.options[optIdx] = contentText;
                    if (isHindiOpt) currentQ.options_hi[optIdx] = contentText;
                    else currentQ.options_en[optIdx] = contentText;
                } else {
                    const emptyIdx = currentQ.options.findIndex(o => !o);
                    if (emptyIdx >= 0 && emptyIdx < 4) {
                        currentQ.options[emptyIdx] = contentText;
                    }
                }
            } else {
                currentQ.question += ' ' + line;
                if (/[\u0900-\u097F]/.test(line)) {
                    currentQ.question_hi = (currentQ.question_hi ? currentQ.question_hi + ' ' : '') + line;
                } else {
                    currentQ.question_en = (currentQ.question_en ? currentQ.question_en + ' ' : '') + line;
                }
            }
        }
    }
    if (currentQ) rawQuestions.push(currentQ);

    // BLOCK/PARAGRAPH FALLBACK if 0 questions were detected by line prefixes
    if (rawQuestions.length === 0 && cleanRes.text.trim().length > 0) {
        const blocks = cleanRes.text.split(/\n\s*\n/);
        let blockQNum = 1;
        let pendingQText = '';

        for (let block of blocks) {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) continue;

            // Check if block contains option indicators like (A), (B), (C), (D) or (1), (2), (3), (4) or A., B., C., D.
            const optionRegex = /(?:^|\n|\s)(?:[\(\[\{]?(?:[A-Da-d1-4१-४]|क|ख|ग|घ|अ|ब|स|द)[\)\]\}]?\s*[-.:)]\s*)([^\n]+)/g;
            const optionMatches = [...trimmedBlock.matchAll(optionRegex)];

            if (optionMatches.length >= 2) {
                const firstOptIndex = optionMatches[0].index;
                let qText = trimmedBlock.substring(0, firstOptIndex).trim();
                if (!qText && pendingQText) {
                    qText = pendingQText;
                    pendingQText = '';
                }
                if (!qText) qText = `Question ${blockQNum}`;

                const options = optionMatches.map(m => m[1].trim()).filter(Boolean).slice(0, 4);
                while (options.length < 4) options.push('');

                rawQuestions.push({
                    questionNumber: blockQNum++,
                    pageNum: 1,
                    question: qText,
                    options: options,
                    options_en: options,
                    options_hi: options,
                    correctIndex: 0,
                    correctAnswer: options[0] || '',
                    category: defaultCategory,
                    subject: defaultSubject
                });
            } else {
                pendingQText = pendingQText ? (pendingQText + ' ' + trimmedBlock) : trimmedBlock;
            }
        }
    }

    // Un-merge embedded questions
    const unmergedQuestions = [];
    rawQuestions.forEach(q => {
        const split = autoFixEngine.splitMergedQuestions(q);
        unmergedQuestions.push(...split);
    });

    return normalizeAIQuestions(unmergedQuestions, defaultCategory, defaultSubject);
}

module.exports = {
    parsePDF,
    cleanExtractedText,
    parseQuestionsHeuristically,
    verifyAndFilterFalsePositives,
    normalizeAIQuestions
};
