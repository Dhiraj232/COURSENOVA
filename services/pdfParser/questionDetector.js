/**
 * Question Detection Engine.
 * Detects all numbering prefixes: 1., 1), Q1, Question 1, Que 1, १., १), ①, ❶, (1), [1], etc.
 */

// Roman numeral converter
function romanToInt(str) {
    if (!str) return NaN;
    const s = str.toUpperCase();
    const romanMap = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let num = 0;
    for (let i = 0; i < s.length; i++) {
        const current = romanMap[s[i]];
        const next = romanMap[s[i + 1]];
        if (!current) return NaN;
        if (next && current < next) {
            num -= current;
        } else {
            num += current;
        }
    }
    return num;
}

// Circled number map
const circleMap = {
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
    '⑪': 11, '⑫': 12, '⑬': 13, '⑭': 14, '⑮': 15, '⑯': 16, '⑰': 17, '⑱': 18, '⑲': 19, '⑳': 20,
    '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5, '❻': 6, '❼': 7, '❽': 8, '❾': 9, '❿': 10
};

// Devanagari digit map
const devanagariMap = {
    '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9
};

// Regex patterns matching diverse question formats at line starts
const qPrefixPatterns = [
    // 1. Explicit question prefix keywords: Q1, Q.1, Q-1, Q1:, Question 1:, Que. 1, प्र 1, प्रश्न 1, प्रश्न-1, प्रश्न सं. 1, प्रश्न संख्या 1
    {
        regex: /^\s*(?:QUESTION\s*(?:NO|NUMBER)?\s*\.?|Question|QUESTION|Que|Q|प्र[.]?|प्रश्न\s*(?:संख्या|सं[.]?|क्रमांक)?)\s*[-.:]?\s*([0-9१२३४५६७८९०]+)\s*[-.:)\]\s]*/i,
        type: 'digit'
    },
    // 2. Parentheses/Brackets prefix: (1), [1], {1}, (Q1), [Q1], (१), [१], (i), (I)
    {
        regex: /^\s*(?:\[|\()(?:\s*Q\s*[-.:]?)?\s*([0-9१२३४५६७८९०IVXLCDMivxlcdm]+)\s*(?:\]|\))\s*/i,
        type: 'flexible'
    },
    // 3. Circled characters: ①, ❶, ②, ❷, etc.
    {
        regex: /^\s*([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳❶❷❸❹❺❻❼❽❾❿])\s*/,
        type: 'circle'
    },
    // 4. Roman numerals with delimiter: I., II., III., IV., i), ii), iii)
    {
        regex: /^\s*([IVXLCDMivxlcdm]{1,8})\s*[-.:)\]]\s+/,
        type: 'roman'
    },
    // 5. Leading digits with delimiter: 1., 1-, 1), 1:, १., १)
    {
        regex: /^\s*([0-9१२३४५६७८९०]+)\s*[-.:)\]]\s*/,
        type: 'digit'
    },
    // 6. Leading digit followed by space + text or math symbol (e.g. "1 What is...", "1 \int...", "1 (x-2)^2")
    {
        regex: /^\s*([0-9१२३४५६७८९०]{1,4})\s+([a-zA-Z\u0900-\u097F\\\/()\[\]{}∫√πθαβλ∆∑∞≤≥≠±÷×+=%#@$&_].*)/,
        type: 'digit_space'
    }
];

/**
 * Checks if a line contains a question prefix and returns the question details
 */
function detectQuestionPrefix(line, ignoreWeakPrefix = false) {
    if (!line) return null;
    const trimmed = line.trim();

    // Safeguard: Ignore lines that represent solution headings, explanations, or answers
    if (/^\s*(?:(?:QUESTION\s*(?:NO|NUMBER)?\s*\.?|Question|QUESTION|Que|Q|प्र[.]?|प्रश्न\s*(?:संख्या|सं[.]?|क्रमांक)?)?\s*[-.:]?\s*[0-9१२३४५६७८९०A-F①-❿a-f]+\s*[-.:)\]]\s*)?(?:(?:text\s+)?(?:solution|explanation|व्याख्या|हल)\b|answer\s*[-:]|उत्तर\s*[-:])/i.test(trimmed)) {
        return null;
    }

    // Safeguard: Ignore lines that start with option prefixes: (1), 1), (A), A), A., (a), (अ), (क), (i)
    if (/^\s*(?:[\(\[\{]?(?:[A-Da-d1-4१-४]|क|ख|ग|घ|अ|ब|स|द|iv|iii|ii|i)[\)\]\}]\s*|[\(\[\{]?(?:[A-Da-d]|क|ख|ग|घ|अ|ब|स|द|iv|iii|ii|i)[\)\]\}]?\s*[-.:)]\s*)/i.test(trimmed)) {
        return null;
    }

    const patterns = qPrefixPatterns;

    for (let patternObj of patterns) {
        const regex = patternObj.regex;
        const match = trimmed.match(regex);
        if (match) {
            let qNumStr = match[1];
            let rawMatch = match[0];
            let qNum = NaN;

            if (circleMap[qNumStr]) {
                qNum = circleMap[qNumStr];
            } else if (/^[0-9]+$/.test(qNumStr)) {
                qNum = parseInt(qNumStr, 10);
            } else {
                // Try Devanagari digit conversion
                let devConverted = '';
                for (let char of qNumStr) {
                    if (devanagariMap[char] !== undefined) {
                        devConverted += devanagariMap[char];
                    }
                }
                if (devConverted) {
                    qNum = parseInt(devConverted, 10);
                } else if (patternObj.type === 'roman' || patternObj.type === 'flexible') {
                    // Try Roman numeral conversion
                    qNum = romanToInt(qNumStr);
                }
            }

            if (!isNaN(qNum) && qNum > 0) {
                let remainingText = '';
                if (patternObj.type === 'digit_space') {
                    remainingText = match[2] ? match[2].trim() : '';
                } else {
                    remainingText = trimmed.substring(rawMatch.length).trim();
                }

                return {
                    questionNumber: qNum,
                    prefix: rawMatch,
                    remainingText: remainingText
                };
            }
        }
    }
    return null;
}

/**
 * Detects passage, direction, or comprehension context banners
 */
function detectPassageHeader(line) {
    if (!line) return null;
    const trimmed = line.trim();
    const passageRegex = /^\s*(?:Direction|Directions|Passage|Comprehension|Case\s+Study|निर्देश|गद्यांश|पद्यांश)\s*[-.:(]*\s*(?:Q\.?\s*\d+\s*(?:to|-)\s*\d+)?\s*[-.:)]*\s*(.*)/i;
    const match = trimmed.match(passageRegex);
    if (match) {
        return {
            isPassage: true,
            title: trimmed,
            text: match[1] ? match[1].trim() : trimmed
        };
    }
    return null;
}

module.exports = {
    detectQuestionPrefix,
    detectPassageHeader,
    qPrefixPatterns,
    romanToInt,
    circleMap,
    devanagariMap
};


