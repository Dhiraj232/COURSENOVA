const fs = require('fs');
const pdfjs = require('pdfjs-dist');

function assessTextQuality(text) {
    if (!text || text.trim().length < 100) return 0;
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const replacementRatio = replacementCount / text.length;
    const letterCount = (text.match(/[a-zA-Z\u0900-\u097F0-9]/g) || []).length;
    const nonWhitespaceCount = text.replace(/\s/g, '').length;
    const letterRatio = letterCount / Math.max(1, nonWhitespaceCount);
    
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
    
    console.log(`PDF Loaded. Total pages: ${doc.numPages}`);
    
    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.filter(item => item.str && item.str.trim().length > 0);
        
        let rawText = '';
        textItems.forEach(item => {
            rawText += item.str + '\n';
        });
        
        const quality = assessTextQuality(rawText);
        console.log(`Page ${p}: items = ${textItems.length}, text length = ${rawText.length}, quality score = ${quality} ${quality < 0.9 ? '-> OCR Fallback!' : ''}`);
    }
}

main().catch(console.error);
