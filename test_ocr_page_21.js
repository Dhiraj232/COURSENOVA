const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { cleanExtractedText, parseQuestionsHeuristically } = require('./services/pdfParsingService');

// Mimic assessTextQuality from services/pdfParsingService.js
function assessTextQuality(text) {
    if (!text || text.trim().length < 100) return 0;
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const replacementRatio = replacementCount / text.length;
    const letterCount = (text.match(/[a-zA-Z\u0900-\u097F0-9]/g) || []).length;
    const nonWhitespaceCount = text.replace(/\s/g, '').length;
    const letterRatio = letterCount / Math.max(1, nonWhitespaceCount);
    
    console.log(`Replacement count: ${replacementCount}, ratio: ${replacementRatio}`);
    console.log(`Letter count: ${letterCount}, non-whitespace: ${nonWhitespaceCount}, ratio: ${letterRatio}`);
    
    if (replacementRatio > 0.05) return 0.5;
    if (letterRatio < 0.6) return 0.4;
    return 1.0;
}

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    const page = await doc.getPage(21);
    const textContent = await page.getTextContent();
    
    // Multi-column sorting algorithm with balance checking (mocked extractTextFromPageItems)
    const items = textContent.items;
    const textItems = items.filter(item => item.str && item.str.trim().length > 0);
    console.log(`Page 21 text items count: ${textItems.length}`);
    
    let rawText = '';
    textItems.forEach(item => {
        rawText += item.str + '\n';
    });
    
    const quality = assessTextQuality(rawText);
    console.log(`Page 21 Text Quality Score: ${quality}`);
}

main().catch(console.error);
