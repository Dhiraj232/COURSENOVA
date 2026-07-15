/**
 * Question Detection Engine.
 * Detects all numbering prefixes: 1., 1), Q1, Question 1, Que 1, १., १), ①, ❶, (1), [1], etc.
 */

// Regex patterns matching diverse question formats at line starts
const qPrefixPatterns = [
    // Standard formats: Q1., Q1 -, Q-1:, Question 1:, Que. 1:
    /^\s*(?:QUESTION\s+NO\s*\.?|Question|QUESTION|Que|Q|प्र[.]?|प्रश्न\s+संख्या|प्रश्न)\s*[-.:]?\s*([0-9]+)\s*[-.:)\]\s]/i,
    // Parents/brackets/circles: (1), [1], ①, ❶, [१], (१)
    /^\s*(?:\[|\()?([0-9१२३४५६७८९०]+)(?:\]|\))\s*/i,
    /^\s*([①②③④⑤⑥⑦⑧⑨⑩❶❷❸❹❺❻❼❽❾❿])\s*/,
    // Leading digit with delimiter: 1., 1-, 1)
    /^\s*([0-9१२३४५६७८९०]+)\s*[-.:)\]]\s*/
];

/**
 * Checks if a line contains a question prefix and returns the question details
 */
function detectQuestionPrefix(line) {
    if (!line) return null;
    const trimmed = line.trim();

    for (let regex of qPrefixPatterns) {
        const match = trimmed.match(regex);
        if (match) {
            // Extracted raw number matching group
            let qNumStr = match[1];
            let rawMatch = match[0];
            
            // Map circled characters to standard integers
            const circleMap = {
                '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
                '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5, '❻': 6, '❼': 7, '❽': 8, '❾': 9, '❿': 10
            };
            let qNum = parseInt(qNumStr, 10);
            if (circleMap[qNumStr]) {
                qNum = circleMap[qNumStr];
            } else if (isNaN(qNum)) {
                // Try converting Devnagari digits
                const devanagariMap = {
                    '०': 0, '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9
                };
                let converted = '';
                for (let char of qNumStr) {
                    if (devanagariMap[char] !== undefined) {
                        converted += devanagariMap[char];
                    }
                }
                if (converted) qNum = parseInt(converted, 10);
            }

            if (!isNaN(qNum) && qNum > 0) {
                return {
                    questionNumber: qNum,
                    prefix: rawMatch,
                    remainingText: trimmed.substring(rawMatch.length).trim()
                };
            }
        }
    }
    return null;
}

module.exports = {
    detectQuestionPrefix,
    qPrefixPatterns
};
