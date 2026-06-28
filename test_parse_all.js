const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function extractImagesFromPage(page, pageNum) {
    const images = [];
    try {
        console.log(`  [Images] Getting operator list...`);
        const operatorList = await page.getOperatorList();
        const objIds = [];
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
                objIds.push(operatorList.argsArray[i][0]);
            }
        }
        console.log(`  [Images] Found ${objIds.length} image objects.`);
        for (let objId of objIds) {
            console.log(`  [Images] Getting image object ${objId}...`);
            
            // Set a timeout fallback so we never hang indefinitely on page.objs.get!
            const img = await Promise.race([
                new Promise((resolve) => {
                    page.objs.get(objId, (o) => resolve(o));
                }),
                new Promise((resolve) => {
                    setTimeout(() => {
                        console.log(`  [Images] Timeout getting image ${objId}`);
                        resolve(null);
                    }, 2000);
                })
            ]);
            
            if (img && img.width > 20 && img.height > 20) {
                console.log(`  [Images] Image retrieved: ${img.width}x${img.height}`);
                const canvas = createCanvas(img.width, img.height);
                const ctx = canvas.getContext('2d');
                const imgData = ctx.createImageData(img.width, img.height);
                const data = imgData.data;
                const src = img.data;
                
                if (img.data.length === img.width * img.height * 3) {
                    let dstIdx = 0;
                    for (let srcIdx = 0; srcIdx < src.length; srcIdx += 3) {
                        data[dstIdx] = src[srcIdx];
                        data[dstIdx + 1] = src[srcIdx + 1];
                        data[dstIdx + 2] = src[srcIdx + 2];
                        data[dstIdx + 3] = 255;
                        dstIdx += 4;
                    }
                } else {
                    data.set(src);
                }
                ctx.putImageData(imgData, 0, 0);
                const buffer = canvas.toBuffer('image/jpeg');
                images.push({
                    buffer,
                    width: img.width,
                    height: img.height,
                    pageNum
                });
            }
        }
    } catch (err) {
        console.error(`  [Images] Failed on page ${pageNum}:`, err.message);
    }
    return images;
}

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
        console.log(`--- Processing Page ${pNum}... ---`);
        const page = await doc.getPage(pNum);
        console.log(`  Getting text content...`);
        const textContent = await page.getTextContent();
        console.log(`  Page items: ${textContent.items.length}`);
        
        console.log(`  Extracting images...`);
        const pageImages = await extractImagesFromPage(page, pNum);
        console.log(`  Extracted ${pageImages.length} images.`);
    }
    console.log("Trace complete!");
}

main().catch(console.error);
