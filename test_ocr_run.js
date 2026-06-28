const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');

async function main() {
    console.log("Loading PDF...");
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    console.log("Loading Page 22...");
    const page = await doc.getPage(22);
    
    console.log("Rendering Page 22 to canvas...");
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    await page.render({ canvasContext: context, viewport }).promise;
    console.log("Canvas rendered successfully. Converting to PNG buffer...");
    
    const pngBuffer = canvas.toBuffer('image/png');
    console.log(`PNG buffer created: ${pngBuffer.length} bytes.`);
    
    console.log("Running Tesseract OCR on PNG buffer (eng+hin)...");
    const startTime = Date.now();
    const ocrResult = await Tesseract.recognize(pngBuffer, 'eng+hin');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`Tesseract OCR completed in ${duration}s!`);
    console.log("Extracted Text Length:", ocrResult.data.text.length);
    console.log("--- Extracted Text ---");
    console.log(ocrResult.data.text);
    console.log("--- End ---");
}

main().catch(err => {
    console.error("OCR test failed:", err);
});
