/**
 * Layout Engine for dynamic column and zone detection.
 * Separates page margins, header/footers and reads text in logical sequence:
 * Top-Left -> Bottom-Left -> Top-Right -> Bottom-Right.
 */
function extractTextFromPageItems(items, pageWidth = 595, pageHeight = 842) {
    const defaultResult = { text: '', layoutType: 'Single Column', columnCount: 1 };
    if (!items || items.length === 0) return defaultResult;
    let textItems = items.filter(item => item.str && item.str.trim().length > 0);
    if (textItems.length === 0) return defaultResult;

    // Filter out duplicate overlapping text items (e.g. shadow/bold rendering in PDF)
    const uniqueItems = [];
    textItems.forEach(item => {
        const x = item.transform[4];
        const y = item.transform[5];
        const str = item.str;
        // Check if there is already an item with identical text at almost identical coordinates
        const isDuplicate = uniqueItems.some(existing => {
            const dx = Math.abs(existing.transform[4] - x);
            const dy = Math.abs(existing.transform[5] - y);
            return dx < 1.0 && dy < 1.0 && existing.str === str;
        });
        if (!isDuplicate) {
            uniqueItems.push(item);
        }
    });
    textItems = uniqueItems;

    const minX = Math.min(...textItems.map(item => item.transform[4]));
    const maxX = Math.max(...textItems.map(item => item.transform[4] + (item.width || 0)));
    const minY = Math.min(...textItems.map(item => item.transform[5]));
    const maxY = Math.max(...textItems.map(item => item.transform[5]));
    const pageSpan = maxX - minX;
    const pageHeightSpan = maxY - minY;

    // Ignore headers/footers to avoid gutter blocking
    const gutterDetectionMinY = minY + pageHeightSpan * 0.08;
    const gutterDetectionMaxY = minY + pageHeightSpan * 0.92;
    const bodyItems = textItems.filter(item => {
        const y = item.transform[5];
        return y >= gutterDetectionMinY && y <= gutterDetectionMaxY;
    });

    const numBins = 100;
    const binWidth = pageSpan / numBins;
    const bins = new Array(numBins).fill(0);

    bodyItems.forEach(item => {
        const xStart = item.transform[4] - minX;
        const xEnd = xStart + (item.width || 0);
        const startBin = Math.max(0, Math.floor(xStart / binWidth));
        const endBin = Math.min(numBins - 1, Math.floor(xEnd / binWidth));
        for (let b = startBin; b <= endBin; b++) {
            bins[b]++;
        }
    });

    const threshold = 1;
    let inGutter = false;
    let gutterStart = -1;
    const detectedGutters = [];

    // Scan horizontal middle ranges for columns
    for (let b = 10; b < 90; b++) {
        if (bins[b] <= threshold) {
            if (!inGutter) {
                inGutter = true;
                gutterStart = b;
            }
        } else {
            if (inGutter) {
                const gutterEnd = b - 1;
                const width = gutterEnd - gutterStart + 1;
                if (width >= 2) {
                    detectedGutters.push({ start: gutterStart, end: gutterEnd, width });
                }
                inGutter = false;
            }
        }
    }
    if (inGutter) {
        const gutterEnd = 89;
        const width = gutterEnd - gutterStart + 1;
        if (width >= 2) {
            detectedGutters.push({ start: gutterStart, end: gutterEnd, width });
        }
    }

    detectedGutters.sort((a, b) => b.width - a.width);

    let colBoundaries = [];
    let layoutType = 'Single Column';
    
    if (detectedGutters.length >= 2) {
        const g1 = detectedGutters[0];
        const g2 = detectedGutters[1];
        const c1 = minX + (g1.start + g1.width / 2) * binWidth;
        const c2 = minX + (g2.start + g2.width / 2) * binWidth;
        
        const distance = Math.abs(c1 - c2);
        if (distance > pageSpan * 0.20) {
            colBoundaries = [c1, c2].sort((a, b) => a - b);
            layoutType = 'Triple Column';
        }
    }
    
    if (colBoundaries.length === 0 && detectedGutters.length >= 1) {
        const g = detectedGutters[0];
        const centerBin = g.start + g.width / 2;
        if (centerBin >= 30 && centerBin <= 70) {
            const boundary = minX + centerBin * binWidth;
            colBoundaries = [boundary];
            layoutType = 'Double Column';
        }
    }

    const headerItems = textItems.filter(item => item.transform[5] > gutterDetectionMaxY);
    const footerItems = textItems.filter(item => item.transform[5] < gutterDetectionMinY);
    const bodySegmentItems = textItems.filter(item => {
        const y = item.transform[5];
        return y >= gutterDetectionMinY && y <= gutterDetectionMaxY;
    });

    const formatColumnItems = (itemsList) => {
        const lines = [];
        itemsList.forEach(item => {
            const y = item.transform[5];
            let foundLine = lines.find(l => Math.abs(l.y - y) < 4.0);
            if (foundLine) {
                foundLine.items.push(item);
            } else {
                lines.push({ y, items: [item] });
            }
        });

        lines.sort((a, b) => b.y - a.y);

        let text = '';
        lines.forEach(line => {
            line.items.sort((a, b) => a.transform[4] - b.transform[4]);
            const lineText = line.items.map(item => item.str).join(' ');
            text += (text ? '\n' : '') + lineText;
        });
        return text;
    };

    let pageText = '';
    if (headerItems.length > 0) {
        pageText += formatColumnItems(headerItems) + '\n\n';
    }

    if (colBoundaries.length > 0) {
        const columns = Array.from({ length: colBoundaries.length + 1 }, () => []);
        bodySegmentItems.forEach(item => {
            const x = item.transform[4];
            let colIdx = 0;
            while (colIdx < colBoundaries.length && x >= colBoundaries[colIdx]) {
                colIdx++;
            }
            columns[colIdx].push(item);
        });

        columns.forEach(colItems => {
            if (colItems.length > 0) {
                pageText += formatColumnItems(colItems) + '\n\n';
            }
        });
    } else {
        if (bodySegmentItems.length > 0) {
            pageText += formatColumnItems(bodySegmentItems) + '\n\n';
        }
    }

    if (footerItems.length > 0) {
        pageText += formatColumnItems(footerItems);
    }

    return {
        text: pageText.trim(),
        layoutType,
        columnCount: colBoundaries.length + 1
    };
}

module.exports = {
    extractTextFromPageItems
};
