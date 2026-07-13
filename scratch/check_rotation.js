const fs = require('fs');
const pdfjs = require('pdfjs-dist');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199 (1).pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        console.log(`Page ${i}: rotate = ${page.rotate}, viewport rotate = ${page.getViewport({ scale: 1.0 }).rotation}`);
    }
}
main().catch(console.error);
