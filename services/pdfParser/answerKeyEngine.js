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

const { mapOptionLabelToIndex } = require('./optionDetector');

/**
 * Maps option string (A, B, C, D, 1, 2, 3, 4, अ, ब, स, द, क, ख, ग, घ) to 0-based index (0, 1, 2, 3)
 */
function mapOptionToIndex(optionStr) {
    if (!optionStr) return -1;
    return mapOptionLabelToIndex(optionStr);
}

module.exports = {
    isAnswerKeySectionStart,
    mapOptionToIndex
};
