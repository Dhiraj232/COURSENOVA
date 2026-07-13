const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function inspect(pageNum) {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199.pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    if (pageNum > doc.numPages) return;
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    fs.writeFileSync(`d:\\COURSENOVA\\scratch\\full_page${pageNum}.png`, canvas.toBuffer('image/png'));
    console.log(`Saved full_page${pageNum}.png`);
}

async function main() {
    await inspect(1);
    await inspect(4);
    await inspect(7);
}

main().catch(console.error);
