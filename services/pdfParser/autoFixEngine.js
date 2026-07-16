/**
 * AI Auto Fix Engine.
 * Automatically repairs broken options, inline options, missing labels, Unicode, split paragraphs, spacing.
 */

const { formatAndWrapLaTeX } = require('./formulaEngine');

// Regex patterns to identify inline options merged in the question text
const inlineOptionPatterns = [
    {
        regex: /\s+A\s+(.+?)\s+B\s+(.+?)\s+C\s+(.+?)\s+D\s+(.+)$/,
        labels: ['A', 'B', 'C', 'D']
    },
    {
        regex: /\s+\(A\)\s*(.+?)\s*\(B\)\s*(.+?)\s*\(C\)\s*(.+?)\s*\(D\)\s*(.+)$/i,
        labels: ['A', 'B', 'C', 'D']
    },
    {
        regex: /\s+a\s+(.+?)\s+b\s+(.+?)\s+c\s+(.+?)\s+d\s+(.+)$/,
        labels: ['a', 'b', 'c', 'd']
    },
    {
        regex: /\s+\(a\)\s*(.+?)\s*\(b\)\s*(.+?)\s*\(c\)\s*(.+?)\s*\(d\)\s*(.+)$/i,
        labels: ['a', 'b', 'c', 'd']
    },
    {
        regex: /\s+1\)\s*(.+?)\s*2\)\s*(.+?)\s*3\)\s*(.+?)\s*4\)\s*(.+)$/,
        labels: ['1', '2', '3', '4']
    },
    {
        regex: /\s+1\.\s*(.+?)\s*2\.\s*(.+?)\s*3\.\s*(.+?)\s*4\.\s*(.+)$/,
        labels: ['1', '2', '3', '4']
    },
    {
        regex: /\s+१\s+(.+?)\s+२\s+(.+?)\s+३\s+(.+?)\s+४\s+(.+)$/,
        labels: ['१', '२', '३', '४']
    },
    {
        regex: /\s+क\s+(.+?)\s+ख\s+(.+?)\s+ग\s+(.+?)\s+घ\s+(.+)$/,
        labels: ['क', 'ख', 'ग', 'घ']
    }
];

function autoFixQuestion(q) {
    if (!q) return q;

    // 1. Extract inline options if current options list is empty or invalid
    const currentValidOpts = (q.options || []).filter(o => o && o.trim() !== '');
    
    if (currentValidOpts.length === 0) {
        let qText = q.question_en || q.question || '';
        for (let pattern of inlineOptionPatterns) {
            const match = qText.match(pattern.regex);
            if (match) {
                const optA = match[1].trim();
                const optB = match[2].trim();
                const optC = match[3].trim();
                const optD = match[4].trim();
                
                q.options = [optA, optB, optC, optD];
                q.options_en = [optA, optB, optC, optD];
                
                // Strip inline options suffix from question text
                const stripped = qText.replace(pattern.regex, '').trim();
                q.question_en = stripped;
                q.questionEnglish = stripped;
                q.question = stripped;
                break;
            }
        }

        // Apply similar logic for Hindi if available
        let qTextHi = q.question_hi || '';
        if (qTextHi) {
            for (let pattern of inlineOptionPatterns) {
                const match = qTextHi.match(pattern.regex);
                if (match) {
                    const optA = match[1].trim();
                    const optB = match[2].trim();
                    const optC = match[3].trim();
                    const optD = match[4].trim();
                    
                    q.options_hi = [optA, optB, optC, optD];
                    const stripped = qTextHi.replace(pattern.regex, '').trim();
                    q.question_hi = stripped;
                    q.questionHindi = stripped;
                    break;
                }
            }
        }
    }

    // 2. Split side-by-side options (e.g. Option A contains (B) label, Option C contains (D) label)
    const splitSideBySide = (optionsArray) => {
        if (!Array.isArray(optionsArray)) return optionsArray;
        
        let newOpts = [...optionsArray];
        // Ensure at least 4 items
        while (newOpts.length < 4) newOpts.push('');
        
        // Check A contains B
        if (newOpts[0]) {
            const matchB = newOpts[0].match(/(.+?)\s+[(]?(?:B|b|ख|2)[)]?[-.:)]\s*(.+)$/i);
            if (matchB) {
                newOpts[0] = matchB[1].trim();
                newOpts[1] = matchB[2].trim();
            }
        }
        
        // Check C contains D
        if (newOpts[2]) {
            const matchD = newOpts[2].match(/(.+?)\s+[(]?(?:D|d|घ|4)[)]?[-.:)]\s*(.+)$/i);
            if (matchD) {
                newOpts[2] = matchD[1].trim();
                newOpts[3] = matchD[2].trim();
            }
        }
        
        return newOpts;
    };

    if (q.options) q.options = splitSideBySide(q.options);
    if (q.options_en) q.options_en = splitSideBySide(q.options_en);
    if (q.options_hi) q.options_hi = splitSideBySide(q.options_hi);

    // 3. Repair split paragraphs and format math notation
    if (q.question_en) {
        q.question_en = formatAndWrapLaTeX(
            q.question_en
                .replace(/\s+/g, ' ')
                .replace(/-\s+/g, '') // fix hyphenated words
                .trim()
        );
        q.questionEnglish = q.question_en;
        q.question = q.question_en;
    }
    if (q.question_hi) {
        q.question_hi = formatAndWrapLaTeX(q.question_hi.replace(/\s+/g, ' ').trim());
        q.questionHindi = q.question_hi;
    }

    // 4. Repair broken option labels and format options math notation
    const repairOption = (opt) => {
        if (!opt) return '';
        const cleanedOpt = opt.replace(/^\s*(?:[(]?(?:[A-F]|[a-f]|[1-6]|[①②③④⑤⑥]|[❶❷❸❹❺❻])[)]?[-.:)]\s*|([①②③④⑤⑥]|[❶❷❸❹❺❻])\s*)/, '').trim();
        return formatAndWrapLaTeX(cleanedOpt);
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

    // Ensure exactly 4 options
    while (q.options.length < 4) q.options.push('');
    while (q.options_en.length < 4) q.options_en.push('');
    if (q.options_hi.length > 0) {
        while (q.options_hi.length < 4) q.options_hi.push('');
    }

    // Update correct answer string based on index
    if (q.correctIndex !== undefined && q.correctIndex >= 0 && q.correctIndex < q.options.length) {
        q.correctAnswer = q.options_en[q.correctIndex] || q.options[q.correctIndex] || '';
    }

    return q;
}

module.exports = {
    autoFixQuestion
};
