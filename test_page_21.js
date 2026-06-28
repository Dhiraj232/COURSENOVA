const fs = require('fs');
const pdfjs = require('pdfjs-dist');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    console.log(`PDF Loaded. Total pages: ${doc.numPages}`);
    
    for (let p = 21; p <= doc.numPages; p++) {
        console.log(`Loading Page ${p}...`);
        const page = await doc.getPage(p);
        console.log(`Getting Text Content for Page ${p}...`);
        const textContent = await page.getTextContent();
        console.log(`Page ${p} has ${textContent.items.length} items.`);
    }
    console.log("Success! Pages 21-22 loaded and parsed cleanly.");
}

main().catch(console.error);
