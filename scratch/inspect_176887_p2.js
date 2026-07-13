const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function inspect() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\176887.pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    const page = await doc.getPage(2);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    fs.writeFileSync('d:\\COURSENOVA\\scratch\\176887_page2.png', canvas.toBuffer('image/png'));
    console.log('Saved 176887_page2.png');
}
inspect().catch(console.error);
