const { createCanvas } = require('canvas');

/**
 * Visual preprocessor utility for enhancing scanned PDF pages before OCR/Vision.
 */

/**
 * Main function to preprocess a canvas element.
 * @param {Canvas} canvas - The node-canvas instance containing the rendered page.
 * @returns {Canvas} - A new canvas with enhanced image data.
 */
function preprocessPageCanvas(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    
    // 1. Get raw image data
    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;

    // 2. Convert to Grayscale & Calculate min/max for Contrast Stretch
    let min = 255;
    let max = 0;
    const len = data.length;
    const gray = new Uint8ClampedArray(len / 4);

    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const val = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        gray[i / 4] = val;
        if (val < min) min = val;
        if (val > max) max = val;
    }

    // Adjust min/max bounds to avoid divide-by-zero
    if (max === min) {
        max = 255;
        min = 0;
    }

    // 3. Apply Contrast Stretch + Soft Threshold (Watermark & Noise Removal)
    for (let i = 0; i < len; i += 4) {
        const idx = i / 4;
        let val = gray[idx];

        // Contrast stretch
        val = Math.round(((val - min) / (max - min)) * 255);

        // Watermark filter: Watermarks are typically light colors. If pixel is lighter than threshold, make it pure white.
        if (val > 195) {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
        } else {
            // Keep text dark and enhanced
            const darkened = Math.max(0, Math.round(val * 0.8));
            data[i] = darkened;
            data[i + 1] = darkened;
            data[i + 2] = darkened;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // 4. Sharpen (3x3 Convolution Kernel)
    const sharpenKernel = [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
    ];
    imgData = applyConvolution(canvas, sharpenKernel);
    ctx.putImageData(imgData, 0, 0);

    // 5. Crop Blank Margins
    const croppedCanvas = cropBlankMargins(canvas);
    return croppedCanvas;
}

/**
 * Applies a 3x3 convolution filter to a canvas.
 */
function applyConvolution(canvas, kernel) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const srcData = ctx.getImageData(0, 0, width, height);
    const dstData = ctx.createImageData(width, height);
    
    const src = srcData.data;
    const dst = dstData.data;
    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dstIdx = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
                    const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
                    const srcIdx = (scy * width + scx) * 4;
                    const wt = kernel[cy * side + cx];

                    r += src[srcIdx] * wt;
                    g += src[srcIdx + 1] * wt;
                    b += src[srcIdx + 2] * wt;
                }
            }

            dst[dstIdx] = Math.min(255, Math.max(0, r));
            dst[dstIdx + 1] = Math.min(255, Math.max(0, g));
            dst[dstIdx + 2] = Math.min(255, Math.max(0, b));
            dst[dstIdx + 3] = src[dstIdx + 3]; // Preserve alpha
        }
    }
    return dstData;
}

/**
 * Crops empty white space around margins.
 */
function cropBlankMargins(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Detect first and last non-white pixels (threshold < 240)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // If the pixel is not white
            if (r < 240 || g < 240 || b < 240) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Add small padding to avoid cropping characters tightly
    const padding = 15;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;

    // If cropped area is too small or invalid, return original canvas
    if (croppedWidth < 50 || croppedHeight < 50) {
        return canvas;
    }

    const croppedCanvas = createCanvas(croppedWidth, croppedHeight);
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

    return croppedCanvas;
}

module.exports = {
    preprocessPageCanvas,
    applyConvolution,
    cropBlankMargins
};
