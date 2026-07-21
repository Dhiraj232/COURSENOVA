/**
 * Validation Engine.
 * Ensures questions conform to the required specifications before db saves.
 */

function validateQuestion(q) {
    const errors = [];

    if (!q) {
        return { isValid: false, errors: ['Empty question object'] };
    }

    // 1. Question number check (Auto-assign 1 if missing)
    if (q.questionNumber === undefined || q.questionNumber === null || q.questionNumber <= 0) {
        q.questionNumber = 1;
    }

    // 2. Question text check (Reject ONLY if completely blank)
    const qText = (q.question || q.question_en || q.question_hi || q.questionEnglish || q.questionHindi || '').toString().trim();
    if (!qText) {
        errors.push('Question text is completely blank.');
    }

    // 3. Minimum 2 options check (Reject ONLY if fewer than 2 valid options)
    const opts = (q.options || q.options_en || []).filter(o => o !== undefined && o !== null && o.toString().trim() !== '');
    if (opts.length < 2) {
        errors.push(`Missing valid options (found ${opts.length}, minimum 2 required).`);
    }

    // Auto-repair correct answer index if missing or out of bounds
    if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= 4) {
        q.correctIndex = 0;
        q.correctAnswer = (q.options_en && q.options_en[0]) || (q.options && q.options[0]) || '';
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    validateQuestion
};

