const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { createCanvas } = require('canvas');

async function extractImagesFromPage(page, pageNum) {
    const images = [];
    try {
        const operatorList = await page.getOperatorList();
        const objIds = [];
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
                objIds.push(operatorList.argsArray[i][0]);
            }
        }
        console.log(`Page ${pageNum} has ${objIds.length} image objects.`);
        for (let objId of objIds) {
            console.log(`Getting image object ${objId}...`);
            const img = await new Promise((resolve) => {
                page.objs.get(objId, (o) => resolve(o));
            });
            if (!img) {
                console.log("Image object is null/undefined.");
                continue;
            }
            console.log(`Image object retrieved. Dimensions: ${img.width}x${img.height}, data length: ${img.data ? img.data.length : 'N/A'}`);
            if (img.width > 20 && img.height > 20) {
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
                console.log(`Saved image buffer.`);
            }
        }
    } catch (err) {
        console.error(`Image extraction failed on page ${pageNum}:`, err.message);
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
    
    console.log("Loading Page 21...");
    const page21 = await doc.getPage(21);
    console.log("Extracting images from Page 21...");
    const imgs21 = await extractImagesFromPage(page21, 21);
    console.log(`Extracted ${imgs21.length} images from Page 21.`);

    console.log("Loading Page 22...");
    const page22 = await doc.getPage(22);
    console.log("Extracting images from Page 22...");
    const imgs22 = await extractImagesFromPage(page22, 22);
    console.log(`Extracted ${imgs22.length} images from Page 22.`);
}

main().catch(console.error);
