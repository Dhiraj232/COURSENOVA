const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');

async function main() {
    console.log("Loading 81199 (1).pdf...");
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\81199 (1).pdf';
    const buffer = fs.readFileSync(pdfPath);
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    console.log(`Loaded. Total pages: ${doc.numPages}`);
    for (let p = 1; p <= doc.numPages; p++) {
        console.log(`Rendering page ${p}...`);
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        
        console.log(`Running OCR on page ${p}...`);
        const pngBuffer = canvas.toBuffer('image/png');
        const result = await Tesseract.recognize(pngBuffer, 'eng+hin');
        console.log(`--- Page ${p} OCR Text ---`);
        console.log(result.data.text);
        console.log('--------------------------');
    }
}

main().catch(err => console.error("Error:", err));
