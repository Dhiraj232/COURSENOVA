const fs = require('fs');
const pdfjs = require('pdfjs-dist');
const { parsePDF } = require('./services/pdfParsingService');

// We import the internals by extracting the functions we need or using eval,
// or we can copy/paste extractTextFromPageItems from services/pdfParsingService.js.
// Let's copy the code of extractTextFromPageItems directly to test it.
function extractTextFromPageItems(items, pageWidth = 595) {
    if (!items || items.length === 0) return '';

    const textItems = items.filter(item => item.str && item.str.trim().length > 0);
    if (textItems.length === 0) return '';

    const minX = Math.min(...textItems.map(item => item.transform[4]));
    const maxX = Math.max(...textItems.map(item => item.transform[4] + (item.width || 0)));
    const span = maxX - minX;

    const numBins = 60;
    const binWidth = span / numBins;
    const bins = new Array(numBins).fill(false);

    const ys = textItems.map(item => item.transform[5]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const heightSpan = maxY - minY;
    const midYMin = minY + heightSpan * 0.15;
    const midYMax = minY + heightSpan * 0.85;

    textItems.forEach(item => {
        const y = item.transform[5];
        if (y < midYMin || y > midYMax) return; 

        const itemWidth = item.width || 0;
        if (itemWidth > span * 0.6) return;

        const xStart = item.transform[4] - minX;
        const xEnd = xStart + itemWidth;

        const startBin = Math.max(0, Math.floor(xStart / binWidth));
        const endBin = Math.min(numBins - 1, Math.ceil(xEnd / binWidth));

        for (let b = startBin; b <= endBin; b++) {
            bins[b] = true;
        }
    });

    const startCheckBin = Math.floor(numBins * 0.25);
    const endCheckBin = Math.floor(numBins * 0.75);
    
    let gaps = [];
    let currentGapStart = -1;

    for (let b = startCheckBin; b <= endCheckBin; b++) {
        if (!bins[b]) {
            if (currentGapStart === -1) {
                currentGapStart = b;
            }
        } else {
            if (currentGapStart !== -1) {
                const gapWidth = b - currentGapStart;
                if (gapWidth >= 2) { 
                    gaps.push({ start: currentGapStart, end: b - 1, width: gapWidth });
                }
                currentGapStart = -1;
            }
        }
    }
    if (currentGapStart !== -1) {
        gaps.push({ start: currentGapStart, end: endCheckBin, width: endCheckBin - currentGapStart + 1 });
    }

    gaps.sort((a, b) => b.width - a.width);

    let colBoundaries = [];
    if (gaps.length >= 2 && gaps[0].width >= 2 && gaps[1].width >= 2) {
        const bound1 = minX + gaps[0].start * binWidth + (gaps[0].width * binWidth / 2);
        const bound2 = minX + gaps[1].start * binWidth + (gaps[1].width * binWidth / 2);
        colBoundaries = [Math.min(bound1, bound2), Math.max(bound1, bound2)];
    } else if (gaps.length >= 1 && gaps[0].width >= 2) {
        const bound = minX + gaps[0].start * binWidth + (gaps[0].width * binWidth / 2);
        colBoundaries = [bound];
    }

    let columns = colBoundaries.length === 0 ? [textItems] : Array.from({ length: colBoundaries.length + 1 }, () => []);

    if (colBoundaries.length > 0) {
        textItems.forEach(item => {
            const x = item.transform[4];
            let colIdx = 0;
            while (colIdx < colBoundaries.length && x >= colBoundaries[colIdx]) {
                colIdx++;
            }
            columns[colIdx].push(item);
        });

        const totalCount = textItems.length;
        let isBalanced = true;
        for (let colItems of columns) {
            if (colItems.length < totalCount * 0.15 && colItems.length < 12) {
                isBalanced = false;
                break;
            }
        }

        if (!isBalanced) {
            colBoundaries = [];
            columns = [textItems];
        }
    }

    let pageText = '';
    columns.forEach((colItems, idx) => {
        colItems.sort((a, b) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            if (Math.abs(yA - yB) < 3.5) {
                return a.transform[4] - b.transform[4];
            }
            return yB - yA;
        });

        let colText = '';
        let lastY = -1;
        colItems.forEach(item => {
            const y = item.transform[5];
            if (lastY === -1) {
                colText += item.str;
            } else if (Math.abs(y - lastY) < 3.5) {
                colText += ' ' + item.str;
            } else {
                colText += '\n' + item.str;
            }
            lastY = y;
        });

        pageText += (pageText ? '\n\n' : '') + colText;
    });

    return pageText;
}

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true
    }).promise;
    
    for (let pNum = 21; pNum <= 22; pNum++) {
        console.log(`Loading page ${pNum}...`);
        const page = await doc.getPage(pNum);
        const textContent = await page.getTextContent();
        
        console.log(`Running extractTextFromPageItems on page ${pNum}...`);
        const text = extractTextFromPageItems(textContent.items, page.view[2]);
        console.log(`Result length: ${text.length}`);
        console.log(`--- Content page ${pNum} ---`);
        console.log(text);
        console.log(`--- End ---`);
    }
}

main().catch(console.error);
