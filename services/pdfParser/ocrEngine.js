const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

/**
 * Assesses text quality of native extracted text.
 * Threshold: 95% accuracy targets.
 */
function assessTextQuality(text) {
    if (!text || text.trim().length < 50) return 0;
    
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const replacementRatio = replacementCount / text.length;
    
    const letterCount = (text.match(/[a-zA-Z\u0900-\u097F0-9]/g) || []).length;
    const nonWhitespaceCount = text.replace(/\s/g, '').length;
    const letterRatio = letterCount / Math.max(1, nonWhitespaceCount);
    
    if (replacementRatio > 0.02) return 0.8; 
    if (letterRatio < 0.65) return 0.8;        
    
    return 1.0; 
}

/**
 * Runs high-fidelity Gemini Vision OCR.
 */
async function runGeminiVisionOCR(pngBuffer, logs = []) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const parts = [
        {
            inlineData: {
                data: pngBuffer.toString('base64'),
                mimeType: 'image/png'
            }
        },
        { text: "Extract ALL text from this page. Keep layout structured. Preserve equations in standard LaTeX (e.g. $x^2$ or \\frac{a}{b}), options, numbers, and tables. Return original text exactly. Translate nothing." }
    ];

    logs.push('[OCR] Running Gemini Vision OCR...');
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const text = result.response.text().trim();
    logs.push('[OCR] Gemini Vision OCR complete.');
    return text;
}

/**
 * Request Google Vision OCR Annotation.
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

/**
 * Request Azure Read API OCR.
 */
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

/**
 * Executes the priority-based OCR pipeline.
 * Gemini Vision -> Google Vision -> Azure -> Tesseract
 */
async function runOCR(pngBuffer, logs = []) {
    // 1. Priority: Gemini Vision
    try {
        const text = await runGeminiVisionOCR(pngBuffer, logs);
        if (text && text.trim().length > 20) return text;
    } catch (err) {
        logs.push(`[OCR Warning] Gemini Vision OCR failed: ${err.message}`);
    }

    // 2. Google Vision
    if (process.env.GOOGLE_VISION_API_KEY) {
        try {
            logs.push('[OCR] Running Google Vision OCR...');
            const text = await requestGoogleVisionOCR(pngBuffer.toString('base64'));
            if (text && text.trim().length > 20) {
                logs.push('[OCR] Google Vision OCR complete.');
                return text;
            }
        } catch (err) {
            logs.push(`[OCR Warning] Google Vision OCR failed: ${err.message}`);
        }
    }

    // 3. Azure Read API
    if (process.env.AZURE_OCR_KEY && process.env.AZURE_OCR_ENDPOINT) {
        try {
            logs.push('[OCR] Running Azure Read API OCR...');
            const text = await requestAzureOCR(pngBuffer.toString('base64'));
            if (text && text.trim().length > 20) {
                logs.push('[OCR] Azure Read API OCR complete.');
                return text;
            }
        } catch (err) {
            logs.push(`[OCR Warning] Azure OCR failed: ${err.message}`);
        }
    }

    // 4. Local Tesseract OCR (eng+hin)
    logs.push('[OCR] Running local Tesseract.js OCR...');
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
 * Surgical Bounding-Box OCR on a targeted sub-region of a page canvas.
 */
async function runTargetedBBoxOCR(pngBuffer, bbox, logs = []) {
    if (!bbox || !bbox.width || !bbox.height) {
        return await runOCR(pngBuffer, logs);
    }
    
    try {
        const { createCanvas, loadImage } = require('canvas');
        const img = await loadImage(pngBuffer);
        
        const cropX = Math.max(0, Math.floor(bbox.x || 0));
        const cropY = Math.max(0, Math.floor(bbox.y || 0));
        const cropW = Math.min(img.width - cropX, Math.ceil(bbox.width));
        const cropH = Math.min(img.height - cropY, Math.ceil(bbox.height));
        
        if (cropW < 20 || cropH < 20) {
            return await runOCR(pngBuffer, logs);
        }

        const canvas = createCanvas(cropW, cropH);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        
        const croppedBuffer = canvas.toBuffer('image/png');
        logs.push(`[Surgical OCR] Running targeted OCR on cropped bounding box [x:${cropX}, y:${cropY}, w:${cropW}, h:${cropH}]`);
        return await runOCR(croppedBuffer, logs);
    } catch (err) {
        logs.push(`[Surgical OCR Warning] Cropped OCR failed, falling back to full image: ${err.message}`);
        return await runOCR(pngBuffer, logs);
    }
}

module.exports = {
    assessTextQuality,
    runGeminiVisionOCR,
    runOCR,
    runTargetedBBoxOCR
};

