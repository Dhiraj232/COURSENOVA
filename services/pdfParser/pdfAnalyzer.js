const { assessTextQuality } = require('./ocrEngine');

/**
 * Detects legacy font encodings such as KrutiDev / Chanakya / Devlys
 */
function detectLegacyFontEncoding(text) {
    if (!text) return 'Standard';
    // KrutiDev / Devlys character combination signatures: ê, Ù, ô, ò, ®, ©, ½, ¾, ¼, î, ï, á, à
    const krutiDevSignatures = /[êÙôò®©½¾¼îïáàÑñæçëè]/g;
    const matches = (text.match(krutiDevSignatures) || []).length;
    if (matches > 10 && !/[\u0900-\u097F]/.test(text)) {
        return 'KrutiDev';
    }
    return 'Standard';
}

/**
 * Analyzes page content and properties
 */
function analyzePage(page, text, pNum) {
    const rotation = page.rotate || 0;
    
    // Watermark detection
    const watermarkKeywords = [
        /draft/i, /confidential/i, /preview/i, /watermark/i, 
        /copyright/i, /www\./i, /downloaded/i, /cracku/i, /testbook/i, /adda247/i
    ];
    const hasWatermark = watermarkKeywords.some(kw => kw.test(text));
    
    // Language & Font Encoding detection
    const fontEncoding = detectLegacyFontEncoding(text);
    const hasHindi = /[\u0900-\u097F]/.test(text) || fontEncoding === 'KrutiDev';
    const hasEnglish = /[a-zA-Z]/.test(text);
    const hasUrdu = /[\u0600-\u06FF]/.test(text);
    const hasSanskrit = /[\u0900-\u097F]/.test(text) && text.includes('||');
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
    const hasBengali = /[\u0980-\u09FF]/.test(text);
    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
    const hasPunjabi = /[\u0A00-\u0A7F]/.test(text);

    let language = 'English';
    if (hasHindi && hasEnglish) language = 'Bilingual (English + Hindi)';
    else if (hasHindi) language = 'Hindi';
    else if (hasUrdu) language = 'Urdu';
    else if (hasSanskrit) language = 'Sanskrit';
    else if (hasTamil) language = 'Tamil';
    else if (hasTelugu) language = 'Telugu';
    else if (hasBengali) language = 'Bengali';
    else if (hasGujarati) language = 'Gujarati';
    else if (hasPunjabi) language = 'Punjabi';

    // Type detection (Text vs Scanned vs Mixed)
    const quality = assessTextQuality(text);
    let pageType = 'Text';
    if (quality < 0.95 || text.trim().length < 50) {
        pageType = 'Scanned';
    }

    return {
        pageNum: pNum,
        type: pageType,
        language,
        fontEncoding,
        rotation,
        hasWatermark,
        quality
    };
}

/**
 * Analyzes overall PDF document type
 */
function analyzeDocument(pagesAnalysis) {
    const total = pagesAnalysis.length;
    if (total === 0) return { type: 'Unknown', language: 'English' };

    const scannedCount = pagesAnalysis.filter(p => p.type === 'Scanned').length;
    const languages = pagesAnalysis.map(p => p.language);
    const mostCommonLanguage = languages.sort((a,b) =>
          languages.filter(v => v===a).length - languages.filter(v => v===b).length
    ).pop();

    let docType = 'Native Text';
    if (scannedCount === total) {
        docType = 'Scanned PDF';
    } else if (scannedCount > 0) {
        docType = 'Mixed Layout PDF';
    }

    return {
        type: docType,
        language: mostCommonLanguage,
        scannedPages: scannedCount,
        textPages: total - scannedCount
    };
}

function isInstructionPage(text, pNum = 1) {
    if (!text || pNum > 1) return false; // Never skip page 2+ as instruction page
    const lower = text.toLowerCase();
    
    // If page contains clear question prefixes, it is NOT an instruction page
    const hasQuestionsOnPage = /\b(?:Q|Question|Que|प्र[.]?|प्रश्न)\s*[-.:]?\s*[0-9]+/i.test(text) || /(?:^|\n)\s*[0-9]{1,3}\s*[-.:)]\s+[A-Za-z\u0900-\u097F]/m.test(text);
    if (hasQuestionsOnPage) return false;

    const coverKeywords = [
        /candidate\s+must\s+write/i,
        /अभ्यर्थी\s+अपनी/i,
        /परीक्षार्थी\s+अपनी/i,
        /omr\s+answer\s+sheet/i,
        /read\s+the\s+following\s+instructions/i,
        /general\s+instructions/i,
        /सामान्य\s+निर्देश/i
    ];
    const matches = coverKeywords.filter(kw => kw.test(lower)).length;
    return matches >= 2;
}

module.exports = {
    detectLegacyFontEncoding,
    analyzePage,
    analyzeDocument,
    isInstructionPage
};

