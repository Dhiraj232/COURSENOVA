const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199 (1).pdf';
    const doc = await pdfjs.getDocument(new Uint8Array(fs.readFileSync(pdfPath))).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    // Original dimensions
    const w = viewport.width;
    const h = viewport.height;
    console.log(`Original dimensions: ${w}x${h}`);
    
    // Render original page to canvas
    const origCanvas = createCanvas(w, h);
    const origContext = origCanvas.getContext('2d');
    await page.render({ canvasContext: origContext, viewport }).promise;
    
    // Create new canvas with swapped dimensions for rotated image
    const rotCanvas = createCanvas(h, w);
    const rotContext = rotCanvas.getContext('2d');
    
    // Rotate 90 degrees counter-clockwise
    rotContext.translate(h / 2, w / 2);
    rotContext.rotate(-Math.PI / 2);
    rotContext.drawImage(origCanvas, -w / 2, -h / 2);
    
    fs.writeFileSync('d:\\COURSENOVA\\scratch\\page1_rotated.png', rotCanvas.toBuffer('image/png'));
    console.log('Saved page1_rotated.png');
}
main().catch(console.error);
