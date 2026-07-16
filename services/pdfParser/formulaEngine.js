/**
 * Formula Engine.
 * Formats mathematical formulas, chemical equations, fractions, superscript, subscript.
 */

/**
 * Validates and repairs LaTeX formula formatting
 */
function formatAndWrapLaTeX(text) {
    if (!text) return '';

    // Convert vector representations (e.g. ii -> \vec{i}, i⃗ -> \vec{i})
    let cleaned = text
        .replace(/([i-k])\s*[⃗→]/g, '\\vec{$1}')
        .replace(/\b(ii|jj|kk)\b/g, (m) => `\\vec{${m[0]}}`)
        .replace(/→\s*→/g, '')
        .replace(/→/g, '');

    // Replace common broken conversions with standard LaTeX format
    cleaned = cleaned
        .replace(/\\frac\s*([^{]+)\s*([^{]+)/g, '\\frac{$1}{$2}') // fix raw \frac a b
        .replace(/(\b\d+)\/(\d+\b)/g, '\\frac{$1}{$2}')            // convert simple division to LaTeX fraction
        .replace(/([a-zA-Z0-9\vec{}]+)\^([a-zA-Z0-9\vec{}]+)/g, '$1^{$2}')     // wrap superscript
        .replace(/([a-zA-Z0-9\vec{}]+)_([a-zA-Z0-9\vec{}]+)/g, '$1_{$2}');     // wrap subscript

    // Standard Math symbols replacements
    const mathMap = {
        '√': '\\sqrt',
        '∛': '\\croot',
        '∫': '\\int',
        '∬': '\\iint',
        '∑': '\\sum',
        'π': '\\pi',
        'θ': '\\theta',
        '∞': '\\infty',
        '≤': '\\le',
        '≥': '\\ge',
        '≈': '\\approx',
        '≠': '\\ne',
        '±': '\\pm',
        '×': '\\times',
        '÷': '\\div'
    };

    for (let symbol in mathMap) {
        cleaned = cleaned.replace(new RegExp(symbol, 'g'), mathMap[symbol]);
    }

    // Simple chemical structural replacements
    cleaned = cleaned
        .replace(/\bH2O\b/g, '$H_{2}O$')
        .replace(/\bCO2\b/g, '$CO_{2}$');

    return cleaned;
}

module.exports = {
    formatAndWrapLaTeX
};
