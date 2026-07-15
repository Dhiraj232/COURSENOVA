/**
 * Import Report Generator.
 * Compiles stats and logs on duplicates, skipped pages, OCR usage, and parsing confidence metrics.
 */

function generateReport(finalQuestions, logs, statsInfo, validationErrors) {
    const total = statsInfo.total || finalQuestions.length;
    const valid = statsInfo.valid || 0;
    const warning = statsInfo.warning || 0;
    const duplicate = statsInfo.duplicate || 0;
    const ocrCount = statsInfo.ocr || 0;
    const visionCount = statsInfo.vision || 0;
    const imagesCount = statsInfo.imagesCount || 0;
    const skippedPages = statsInfo.skippedPages || 0;

    // Calculate a confidence ratio based on valid count vs total (excluding duplicates)
    const confidencePct = total > 0 ? ((valid / total) * 100).toFixed(1) : '100.0';

    return {
        ok: true,
        report: {
            questionsFound: total + duplicate,
            questionsImported: valid,
            duplicates: duplicate,
            imagesExtracted: imagesCount,
            ocrPagesRun: ocrCount + visionCount,
            skippedPagesCount: skippedPages,
            warningsCount: warning,
            confidence: `${confidencePct}%`
        },
        questions: finalQuestions,
        validationErrors,
        logs: logs.slice(-100) // Keep recent 100 logs for UI display
    };
}

module.exports = {
    generateReport
};
