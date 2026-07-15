/**
 * Formula Engine.
 * Formats mathematical formulas, chemical equations, fractions, superscript, subscript.
 */

/**
 * Validates and repairs LaTeX formula formatting
 */
function formatAndWrapLaTeX(text) {
    if (!text) return '';

    // Replace common broken conversions with standard LaTeX format
    let cleaned = text
        .replace(/\\frac\s*([^{]+)\s*([^{]+)/g, '\\frac{$1}{$2}') // fix raw \frac a b
        .replace(/(\b\d+)\/(\d+\b)/g, '\\frac{$1}{$2}')            // convert simple division to LaTeX fraction
        .replace(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, '$1^{$2}')     // wrap superscript
        .replace(/([a-zA-Z0-9]+)_([a-zA-Z0-9]+)/g, '$1_{$2}');     // wrap subscript

    // Simple chemical structural replacements
    cleaned = cleaned
        .replace(/\bH2O\b/g, '$H_{2}O$')
        .replace(/\bCO2\b/g, '$CO_{2}$');

    return cleaned;
}

module.exports = {
    formatAndWrapLaTeX
};
