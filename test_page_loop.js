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
    for (let pNum = 1; pNum <= doc.numPages; pNum++) {
        console.log(`Processing Page ${pNum}...`);
        const page = await doc.getPage(pNum);
        console.log(`Text content page ${pNum}...`);
        const textContent = await page.getTextContent();
        console.log(`Page items: ${textContent.items.length}`);
    }
    console.log("Loop finished.");
}

main().catch(console.error);
