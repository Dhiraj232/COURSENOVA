const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Checks if text indicates the beginning of an Answer Key or detailed solutions section.
 */
function isAnswerKeySectionStart(text) {
    if (!text) return false;
    
    const keywords = [
        /\banswer\s*key\b/i,
        /\bcorrect\s*answers?\b/i,
        /\bउत्तरमाला\b/i,
        /\bउत्तर\s*कुंजी\b/i,
        /\bdetailed\s*solutions?\b/i,
        /\bexplanations?\b/i,
        /\bdiscussion\b/i
    ];
    
    const matchesCount = keywords.filter(kw => kw.test(text)).length;
    if (matchesCount >= 2) return true;
    
    // Check for high density of answer matrix/table indicators: e.g. "1. (b) 2. (c) 3. (a)"
    const matchDensity = text.match(/\b\d+\s*[-.:)]\s*[(]?[A-D][)]?\b/gi) || [];
    if (matchDensity.length >= 5) {
        return true;
    }
    
    return false;
}

/**
 * Maps option string (A, B, C, D) to 0-based index (0, 1, 2, 3)
 */
function mapOptionToIndex(optionStr) {
    if (!optionStr) return -1;
    const clean = optionStr.trim().toUpperCase();
    
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    const idx = alphabet.indexOf(clean);
    if (idx !== -1) return idx;

    // Check Hindi labels
    const hindiMap = { 'क': 0, 'ख': 1, 'ग': 2, 'घ': 3, 'अ': 0, 'ब': 1, 'स': 2, 'द': 3 };
    if (hindiMap[clean] !== undefined) return hindiMap[clean];

    // Check digits
    const num = parseInt(clean, 10);
    if (num >= 1 && num <= 6) return num - 1;

    return -1;
}

module.exports = {
    isAnswerKeySectionStart,
    mapOptionToIndex
};
