const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const pdfParsing = require('../services/pdfParsingService');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    console.log("PDF Loaded. Total pages:", doc.numPages);
    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();
    
    console.log("Page 1 items:", textContent.items.length);
    
    // Let's run individual modules to find which one fails!
    try {
        const layoutEngine = require('../services/pdfParser/layoutEngine');
        const layoutResult = layoutEngine.extractTextFromPageItems(
            textContent.items, 
            page.view ? page.view[2] : 595, 
            page.view ? page.view[3] : 842
        );
        console.log("LayoutEngine output text length:", layoutResult.text.length);
        
        const ocrEngine = require('../services/pdfParser/ocrEngine');
        const quality = ocrEngine.assessTextQuality(layoutResult.text);
        console.log("OCR quality score:", quality);
        
        const pdfAnalyzer = require('../services/pdfParser/pdfAnalyzer');
        const analysis = pdfAnalyzer.analyzePage(page, layoutResult.text, 1);
        console.log("Analyzer output:", analysis);
    } catch (err) {
        console.error("CRITICAL ERROR inside submodules:");
        console.error(err.stack);
    }
}

main().catch(console.error);
