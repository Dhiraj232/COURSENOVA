/**
 * Option Detection Engine.
 * Detects options: A), (B), A., ①, a), 1), True/False, Yes/No, Match columns, etc.
 */

const optionPrefixRegex = /^\s*(?:[(]?([A-F]|[a-f]|[1-6]|[①②③④⑤⑥]|[❶❷❸❹❺❻])[)]?[-.:)]\s*|([①②③④⑤⑥]|[❶❷❸❹❺❻])\s*)(.*)/;

/**
 * Checks if a line starts with an option prefix
 */
function detectOptionPrefix(line) {
    if (!line) return null;
    const trimmed = line.trim();
    
    // Check standard prefix formats: A), (B), A., a), ①, 1)
    const match = trimmed.match(optionPrefixRegex);
    if (match) {
        const rawLabel = match[1] || match[2];
        const content = match[3] || '';
        return {
            label: rawLabel,
            content: content.trim()
        };
    }
    
    // Check Boolean options (True / False, Yes / No)
    const upper = trimmed.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE' || upper === 'YES' || upper === 'NO') {
        return {
            label: trimmed,
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
    
    // Fill placeholders if count < 4
    const result = [...cleaned.slice(0, 4)];
    while (result.length < 4) {
        result.push('');
    }
    return result;
}

module.exports = {
    detectOptionPrefix,
    normalizeOptionsList
};
