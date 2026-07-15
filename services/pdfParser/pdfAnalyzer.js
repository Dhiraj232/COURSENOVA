const { assessTextQuality } = require('./ocrEngine');

/**
 * Analyzes page content and properties
 */
function analyzePage(page, text, pNum) {
    const rotation = page.rotate || 0;
    
    // Watermark detection
    const watermarkKeywords = [
        /draft/i, /confidential/i, /preview/i, /watermark/i, 
        /copyright/i, /www\./i, /downloaded/i
    ];
    const hasWatermark = watermarkKeywords.some(kw => kw.test(text));
    
    // Language detection
    const hasHindi = /[\u0900-\u097F]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    const hasUrdu = /[\u0600-\u06FF]/.test(text);
    const hasSanskrit = /[\u0900-\u097F]/.test(text) && text.includes('||'); // Heuristic
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
    const hasBengali = /[\u0980-\u09FF]/.test(text);
    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
    const hasMarathi = /[\u0900-\u097F]/.test(text); // Similar block to Hindi
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

module.exports = {
    analyzePage,
    analyzeDocument
};
