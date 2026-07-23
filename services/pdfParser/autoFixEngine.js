/**
 * AI Auto Fix Engine.
 * Automatically repairs broken options, inline options, missing labels, Unicode, split paragraphs, spacing.
 */

const { formatAndWrapLaTeX } = require('./formulaEngine');
const optionDetector = require('./optionDetector');

// Regex patterns to identify inline options merged in the question text
const inlineOptionPatterns = [
    {
        regex: /\s+(?:[\(\[]?A[\)\]]?|[A]\.)\s*(.+?)\s+(?:[\(\[]?B[\)\]]?|[B]\.)\s*(.+?)\s+(?:[\(\[]?C[\)\]]?|[C]\.)\s*(.+?)\s+(?:[\(\[]?D[\)\]]?|[D]\.)\s*(.+)$/i,
        labels: ['A', 'B', 'C', 'D']
    },
    {
        regex: /\s+(?:[\(\[]?a[\)\]]?|[a]\.)\s*(.+?)\s+(?:[\(\[]?b[\)\]]?|[b]\.)\s*(.+?)\s+(?:[\(\[]?c[\)\]]?|[c]\.)\s*(.+?)\s+(?:[\(\[]?d[\)\]]?|[d]\.)\s*(.+)$/i,
        labels: ['a', 'b', 'c', 'd']
    },
    {
        regex: /\s+(?:[\(\[]?1[\)\]]?|[1]\.)\s*(.+?)\s+(?:[\(\[]?2[\)\]]?|[2]\.)\s*(.+?)\s+(?:[\(\[]?3[\)\]]?|[3]\.)\s*(.+?)\s+(?:[\(\[]?4[\)\]]?|[4]\.)\s*(.+)$/,
        labels: ['1', '2', '3', '4']
    },
    {
        regex: /\s+(?:[\(\[]?१[\)\]]?|[१]\.)\s*(.+?)\s+(?:[\(\[]?२[\)\]]?|[२]\.)\s*(.+?)\s+(?:[\(\[]?३[\)\]]?|[३]\.)\s*(.+?)\s+(?:[\(\[]?४[\)\]]?|[४]\.)\s*(.+)$/,
        labels: ['१', '२', '३', '४']
    },
    {
        regex: /\s+(?:[\(\[]?क[\)\]]?|[क]\.)\s*(.+?)\s+(?:[\(\[]?ख[\)\]]?|[ख]\.)\s*(.+?)\s+(?:[\(\[]?ग[\)\]]?|[ग]\.)\s*(.+?)\s+(?:[\(\[]?घ[\)\]]?|[घ]\.)\s*(.+)$/,
        labels: ['क', 'ख', 'ग', 'घ']
    },
    {
        regex: /\s*①\s*(.+?)\s*②\s*(.+?)\s*③\s*(.+?)\s*④\s*(.+)$/,
        labels: ['①', '②', '③', '④']
    },
    {
        regex: /\s*❶\s*(.+?)\s*❷\s*(.+?)\s*❸\s*(.+?)\s*❹\s*(.+)$/,
        labels: ['❶', '❷', '❸', '❹']
    }
];

/**
 * Splits a question object if it contains embedded question starts (e.g. "We're getting... 30. They tried to...")
 */
function splitMergedQuestions(q) {
    if (!q || !q.question) return [q];
    const qText = q.question;
    
    // Look for embedded question number markers in the middle of question text (e.g. ". 30. ", ". Q30. ", ". प्रश्न 30. ")
    const embeddedMatch = qText.match(/^(.*?)\s+(?:(?:Q|Question|Que|प्र[.]?|प्रश्न)\s*[-.:]?\s*)?(\d{1,4})[\.\)]\s+(.*)$/i);
    if (embeddedMatch) {
        const text1 = embeddedMatch[1].trim();
        const num2 = parseInt(embeddedMatch[2], 10);
        const text2 = embeddedMatch[3].trim();
        
        if (text1.length > 5 && text2.length > 5) {
            const q1 = {
                ...q,
                question: text1,
                question_en: text1,
                questionEnglish: text1,
                options: [...(q.options || [])],
                options_en: [...(q.options_en || [])]
            };
            const q2 = {
                ...q,
                questionNumber: num2,
                question: text2,
                question_en: text2,
                questionEnglish: text2,
                options: ['', '', '', ''],
                options_en: ['', '', '', ''],
                correctIndex: 0
            };
            return [q1, q2];
        }
    }
    return [q];
}

function autoFixQuestion(q) {
    if (!q) return q;

    // Extract correct answer if embedded inside the question text (e.g., "Correct Option - 1" or "Correct Option : 2")
    let qTextEn = q.question_en || q.question || '';
    let qTextHi = q.question_hi || '';

    const correctPattern = /(?:Correct\s+Option|Correct\s+Answer|Ans|Answer)\s*[-:]\s*([1-6A-Fa-f१-६क-चअ-द])/i;
    
    // Check English question text first
    let correctMatch = qTextEn.match(correctPattern);
    if (correctMatch) {
        const val = correctMatch[1];
        const idx = optionDetector.mapOptionLabelToIndex(val);
        if (idx >= 0 && idx < 6) {
            q.correctIndex = idx;
        }
        // Strip the correct option line from the question
        qTextEn = qTextEn.replace(correctPattern, '').trim();
        q.question_en = qTextEn;
        q.questionEnglish = qTextEn;
        q.question = qTextEn;
    }

    // Check Hindi question text
    const correctPatternHi = /(?:सही\s+विकल्प|उत्तर|हल)\s*[-:]\s*([1-6A-Fa-f१-६क-चअ-द])/;
    let correctMatchHi = qTextHi.match(correctPatternHi) || qTextHi.match(correctPattern);
    if (correctMatchHi) {
        const val = correctMatchHi[1];
        const idx = optionDetector.mapOptionLabelToIndex(val);
        if (idx >= 0 && idx < 6) {
            q.correctIndex = idx;
        }
        qTextHi = qTextHi.replace(correctPatternHi, '').replace(correctPattern, '').trim();
        q.question_hi = qTextHi;
        q.questionHindi = qTextHi;
    }

    // 1. Deep untrap inline options trapped inside option fields (e.g., Option B contains "(A) steel (B) steale")
    let allOptionTexts = [];
    if (Array.isArray(q.options)) {
        allOptionTexts = [...q.options];
    } else {
        allOptionTexts = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''];
    }

    // Check if any option string contains trapped multi-option labels like (A) ... (B) ... or A) ... B) ...
    for (let idx = 0; idx < allOptionTexts.length; idx++) {
        const optStr = allOptionTexts[idx] || '';
        for (let pattern of inlineOptionPatterns) {
            const match = optStr.match(pattern.regex);
            if (match) {
                const cleanOptIdx = optStr.replace(pattern.regex, '').trim();
                const optA = match[1].trim();
                const optB = match[2].trim();
                const optC = match[3] ? match[3].trim() : '';
                const optD = match[4] ? match[4].trim() : '';

                allOptionTexts[idx] = cleanOptIdx || optA;
                if (idx + 1 < 4) allOptionTexts[idx + 1] = optB;
                if (idx + 2 < 4 && optC) allOptionTexts[idx + 2] = optC;
                if (idx + 3 < 4 && optD) allOptionTexts[idx + 3] = optD;

                q.options = allOptionTexts;
                q.options_en = allOptionTexts;
                break;
            }
        }
    }

    // 2. Extract inline options from question text or option strings
    let qText = q.question_en || q.question || '';
    for (let pattern of inlineOptionPatterns) {
        const match = qText.match(pattern.regex);
        if (match) {
            const optA = match[1].trim();
            const optB = match[2].trim();
            const optC = match[3] ? match[3].trim() : '';
            const optD = match[4] ? match[4].trim() : '';
            
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

    // 3. Split side-by-side options (e.g. Option A contains (B) label, Option C contains (D) label)
    const splitSideBySide = (optionsArray) => {
        if (!Array.isArray(optionsArray)) return optionsArray;
        
        let newOpts = [...optionsArray];
        while (newOpts.length < 4) newOpts.push('');
        
        // Check A contains B
        if (newOpts[0]) {
            const matchB = newOpts[0].match(/(.+?)\s+[(]?(?:B|b|ख|2)[)]?[-.:)]\s*(.+)$/i);
            if (matchB) {
                newOpts[0] = matchB[1].trim();
                if (!newOpts[1]) newOpts[1] = matchB[2].trim();
            }
        }
        
        // Check B contains C
        if (newOpts[1]) {
            const matchC = newOpts[1].match(/(.+?)\s+[(]?(?:C|c|ग|3)[)]?[-.:)]\s*(.+)$/i);
            if (matchC) {
                newOpts[1] = matchC[1].trim();
                if (!newOpts[2]) newOpts[2] = matchC[2].trim();
            }
        }

        // Check C contains D
        if (newOpts[2]) {
            const matchD = newOpts[2].match(/(.+?)\s+[(]?(?:D|d|घ|4)[)]?[-.:)]\s*(.+)$/i);
            if (matchD) {
                newOpts[2] = matchD[1].trim();
                if (!newOpts[3]) newOpts[3] = matchD[2].trim();
            }
        }
        
        return newOpts;
    };

    if (q.options) q.options = splitSideBySide(q.options);
    if (q.options_en) q.options_en = splitSideBySide(q.options_en);
    if (q.options_hi) q.options_hi = splitSideBySide(q.options_hi);

    // 4. Repair split paragraphs and format math notation
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

    // 5. Repair broken option labels and format options math notation
    const repairOption = (opt) => {
        if (!opt) return '';
        const cleanedOpt = opt.replace(/^\s*(?:[(]?(?:[A-F]|[a-f]|[1-6]|[①②③④⑤⑥]|[❶❷❸❹❺❻])[)]?[-.:)]\s*|([①②③④⑤⑥]|[❶❷❸...])\s*)/, '').trim();
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

    // 6. Ensure options arrays exist and have at least 4 entries (without inserting fake text)
    if (!Array.isArray(q.options)) q.options = [];
    for (let idx = 0; idx < 4; idx++) {
        if (!q.options[idx]) {
            q.options[idx] = '';
        }
    }
    if (!Array.isArray(q.options_en)) q.options_en = [];
    for (let idx = 0; idx < 4; idx++) {
        if (q.options_en[idx] === undefined) {
            q.options_en[idx] = q.options[idx] || '';
        }
    }

    // Update correct answer string based on index
    if (q.correctIndex !== undefined && q.correctIndex >= 0 && q.correctIndex < q.options.length) {
        q.correctAnswer = q.options_en[q.correctIndex] || q.options[q.correctIndex] || '';
    } else {
        q.correctIndex = 0;
        q.correctAnswer = q.options[0];
    }
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    q.answer = alphabet[q.correctIndex] || 'A';

    return q;
}

module.exports = {
    autoFixQuestion,
    splitMergedQuestions
};

