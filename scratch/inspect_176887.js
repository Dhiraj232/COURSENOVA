const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function inspect() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\176887.pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    console.log(`Pages: ${doc.numPages}`);
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    fs.writeFileSync('d:\\COURSENOVA\\scratch\\176887_page1.png', canvas.toBuffer('image/png'));
    console.log('Saved 176887_page1.png');
}
inspect().catch(console.error);
