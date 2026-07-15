/**
 * AI Auto Fix Engine.
 * Automatically repairs broken options, missing labels, Unicode, split paragraphs, spacing.
 */

function autoFixQuestion(q) {
    if (!q) return q;

    // 1. Repair split paragraphs (remove double spaces or redundant newlines inside sentence structures)
    if (q.question_en) {
        q.question_en = q.question_en
            .replace(/\s+/g, ' ')
            .replace(/-\s+/g, '') // fix split words
            .trim();
        q.questionEnglish = q.question_en;
        q.question = q.question_en;
    }
    if (q.question_hi) {
        q.question_hi = q.question_hi.replace(/\s+/g, ' ').trim();
        q.questionHindi = q.question_hi;
    }

    // 2. Repair broken option labels
    const repairOption = (opt) => {
        if (!opt) return '';
        // If option starts with labels like "A. ", "B) ", "(C) ", remove them
        return opt.replace(/^\s*(?:[(]?[A-F]|[a-f]|[1-6]|[①-⑥]|[❶-❻][)]?[-.:)]\s*|([①-⑥]|[❶-❻])\s*)/, '').trim();
    };

    if (Array.isArray(q.options)) {
        q.options = q.options.map(o => repairOption(o));
    }
    if (Array.isArray(q.options_en)) {
        q.options_en = q.options_en.map(o => repairOption(o));
    }
    if (Array.isArray(q.options_hi)) {
        q.options_hi = q.options_hi.map(o => repairOption(o));
    }

    // Fill blank options to guarantee exactly 4 options
    while (q.options.length < 4) q.options.push('');
    while (q.options_en.length < 4) q.options_en.push('');
    if (q.options_hi.length > 0) {
        while (q.options_hi.length < 4) q.options_hi.push('');
    }

    // Update correct answer string
    if (q.correctIndex !== undefined && q.correctIndex >= 0 && q.correctIndex < q.options.length) {
        q.correctAnswer = q.options_en[q.correctIndex] || q.options[q.correctIndex] || '';
    }

    return q;
}

module.exports = {
    autoFixQuestion
};
