const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist');

let cachedCreateCanvas = null;
function getCreateCanvas() {
    if (cachedCreateCanvas) return cachedCreateCanvas;
    try {
        cachedCreateCanvas = require('canvas').createCanvas;
    } catch (err) {
        console.warn('⚠️ WARNING: Failed to load native "canvas" library in imageEngine.', err.message);
        cachedCreateCanvas = function() {
            throw new Error('Native canvas library is not available.');
        };
    }
    return cachedCreateCanvas;
}

/**
 * Extracts inline images from PDF page operator lists
 */
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
        for (let objId of objIds) {
            const img = await Promise.race([
                new Promise((resolve) => {
                    page.objs.get(objId, (o) => resolve(o));
                }),
                new Promise((resolve) => {
                    setTimeout(() => resolve(null), 1500);
                })
            ]);
            
            if (img && img.width > 20 && img.height > 20) {
                const canvas = getCreateCanvas()(img.width, img.height);
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
        // Safe skip
    }
    return images;
}

/**
 * Saves extracted images to the public assets upload folder
 */
function saveExtractedImages(imagesList, uploadDir) {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const saved = [];
    imagesList.forEach((img, idx) => {
        const filename = `extracted_${Date.now()}_img_p${img.pageNum}_${idx + 1}.jpg`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, img.buffer);
        saved.push({
            url: `/uploads/questions/${filename}`,
            pageNum: img.pageNum,
            matched: false
        });
    });
    return saved;
}

/**
 * Correlates saved page images to questions based on hints and references
 */
function correlateImagesToQuestions(questions, savedImages, logs = []) {
    questions.forEach(q => {
        const pageImages = savedImages.filter(img => img.pageNum === q.pageNum);
        if (pageImages.length > 0) {
            const referencesDiagram = q.hasImage || 
                (q.question_en && q.question_en.toLowerCase().match(/(figure|graph|diagram|circuit|map|geometry|structure)/));
            
            if (referencesDiagram) {
                const unmatched = pageImages.find(img => !img.matched);
                if (unmatched) {
                    q.image = unmatched.url;
                    q.images = [unmatched.url];
                    unmatched.matched = true;
                    logs.push(`[Parser Image] Matched diagram ${unmatched.url} to Question #${q.questionNumber} on page ${q.pageNum}`);
                }
            }
        }
    });
    return questions;
}

module.exports = {
    extractImagesFromPage,
    saveExtractedImages,
    correlateImagesToQuestions
};
