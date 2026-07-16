/**
 * Validation Engine.
 * Ensures questions conform to the required specifications before db saves.
 */

function validateQuestion(q) {
    const errors = [];

    // 1. Question number exists
    if (q.questionNumber === undefined || q.questionNumber === null || q.questionNumber <= 0) {
        errors.push('Missing or invalid question number.');
    }

    // 2. Question text exists and is of appropriate length
    const qText = q.question || q.questionEnglish || q.question_en || q.questionHindi || q.question_hi || '';
    if (!qText.trim()) {
        errors.push('Question text is empty.');
    } else if (qText.trim().length <= 15) {
        errors.push('Question text is too short (<= 15 characters).');
    }

    // 3. Minimum 2 options exist (prefer 4)
    const opts = q.options || [];
    const validOpts = opts.filter(o => o !== undefined && o !== null && o.toString().trim() !== '');
    if (validOpts.length < 2) {
        errors.push(`Missing valid options (found ${validOpts.length}, minimum 2 required).`);
    }

    // 4. Correct answer index matches one of the options
    if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= opts.length) {
        errors.push('Correct option index is missing or out of bounds.');
    }

    // 5. Corrupted Unicode check
    if (qText.includes('\uFFFD') || opts.some(o => o && o.toString().includes('\uFFFD'))) {
        errors.push('Unicode corrupted glyphs detected (\\uFFFD).');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    validateQuestion
};
