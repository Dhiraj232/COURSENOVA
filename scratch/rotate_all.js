const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199 (1).pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    console.log(`Loaded PDF. Pages: ${doc.numPages}`);
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 }); // higher scale for better OCR accuracy!
        const w = viewport.width;
        const h = viewport.height;
        
        const origCanvas = createCanvas(w, h);
        const origContext = origCanvas.getContext('2d');
        await page.render({ canvasContext: origContext, viewport }).promise;
        
        const rotCanvas = createCanvas(h, w);
        const rotContext = rotCanvas.getContext('2d');
        rotContext.translate(h / 2, w / 2);
        rotContext.rotate(-Math.PI / 2);
        rotContext.drawImage(origCanvas, -w / 2, -h / 2);
        
        fs.writeFileSync(`d:\\COURSENOVA\\scratch\\page${i}_upright.png`, rotCanvas.toBuffer('image/png'));
        console.log(`Saved page${i}_upright.png`);
    }
}
main().catch(console.error);
