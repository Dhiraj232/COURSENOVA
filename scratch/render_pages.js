const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199 (1).pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        fs.writeFileSync(`d:\\COURSENOVA\\scratch\\page${i}.png`, canvas.toBuffer('image/png'));
        console.log(`Saved page${i}.png`);
    }
}
main().catch(console.error);
