/**
 * Option Detection Engine.
 * Detects options: A), (B), A., ①, a), 1), (क), क., i), True/False, Yes/No, etc.
 */

// Comprehensive regex for option prefixes at line start: A), (A), A., A -, A:, (a), (1), (क)
const optionPrefixRegex = /^\s*(?:[\(\[\{]?([A-Fa-f1-6कखगघङचअबसद१२३४५६①-⑥❶-❻ivxlcdmIVXLCDM]+)[\)\]\}]?\s*[-.:)\s-]\s*|([①-⑥]|[❶-❻])\s*)(.*)/;

// Map option labels to 0-based indices
function mapOptionLabelToIndex(label) {
    if (!label) return -1;
    const trimmed = label.toString().trim().toUpperCase();

    const optionMap = {
        'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5,
        'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5,
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5,
        'i': 0, 'ii': 1, 'iii': 2, 'iv': 3, 'v': 4, 'vi': 5,
        'क': 0, 'ख': 1, 'ग': 2, 'घ': 3, 'ङ': 4, 'च': 5,
        'अ': 0, 'ब': 1, 'स': 2, 'द': 3,
        '१': 0, '२': 1, '३': 2, '४': 3, '५': 4, '६': 5,
        '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5,
        '❶': 0, '❷': 1, '❸': 2, '❹': 3, '❺': 4, '❻': 5
    };

    if (optionMap[trimmed] !== undefined) {
        return optionMap[trimmed];
    }
    return -1;
}

/**
 * Checks if a line starts with an option prefix
 */
function detectOptionPrefix(line) {
    if (!line) return null;
    const trimmed = line.trim();
    
    // Check standard prefix formats: A), (B), A., a), A -, ①, 1), (क), क.
    const match = trimmed.match(optionPrefixRegex);
    if (match) {
        const rawLabel = match[1] || match[2];
        const content = match[3] || '';
        const idx = mapOptionLabelToIndex(rawLabel);
        if (idx >= 0) {
            return {
                label: rawLabel,
                index: idx,
                content: content.trim()
            };
        }
    }
    
    // Check Boolean options (True / False, Yes / No)
    const upper = trimmed.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE' || upper === 'YES' || upper === 'NO') {
        return {
            label: trimmed,
            index: -1,
            content: ''
        };
    }

    return null;
}

/**
 * Normalizes options list to exactly 4 options.
 */
function normalizeOptionsList(optionsArray) {
    if (!Array.isArray(optionsArray)) return ['', '', '', ''];
    const cleaned = optionsArray.filter(o => o !== undefined && o !== null).map(o => o.toString().trim());
    
    const result = [...cleaned.slice(0, 4)];
    while (result.length < 4) {
        result.push('');
    }
    return result;
}

module.exports = {
    detectOptionPrefix,
    mapOptionLabelToIndex,
    normalizeOptionsList
};

