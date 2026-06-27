const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extracts practice questions from a PDF buffer using Gemini.
 * @param {Buffer} pdfBuffer - The raw PDF buffer.
 * @param {Object} defaults - Default category and subject fallback values.
 * @returns {Promise<Array>} - Resolves to an array of parsed question objects.
 */
async function extractQuestionsFromPdf(pdfBuffer, defaults = {}, startPage = null, endPage = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash for PDF analysis and structured output
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare PDF inline data
    const pdfPart = {
        inlineData: {
            data: pdfBuffer.toString('base64'),
            mimeType: 'application/pdf'
        }
    };

    let pageRangeText = 'extract ALL MCQ questions from it.';
    if (startPage !== null && endPage !== null) {
        pageRangeText = `extract ALL MCQ questions found on pages ${startPage} to ${endPage} (inclusive). Do NOT extract questions from any other pages.`;
    }

    const prompt = `You are a professional MCQ exam question parser. Analyze the uploaded PDF and ${pageRangeText}
Support normal and scanned (OCR) PDFs, English, Hindi, and mixed English/Hindi.
Preserve all mathematical formulas in standard LaTeX format (e.g. $x^2 + y^2 = z^2$ or \\frac{a}{b}).
Preserve tables and diagrams as Markdown or HTML representations inside the question text.

For each MCQ, construct a JSON object containing the exact fields:
- question: The main question text in English. If the PDF has bilingual questions (English and Hindi), this should be the English version. If only Hindi is available, this should be in Hindi.
- question_en: The English version of the question text. If the PDF only has Hindi, translate the question to English here.
- question_hi: The Hindi version of the question text. If the PDF only has English, translate the question to Hindi here.
- options: An array of exactly 4 option strings, matching the English version (or default version if only one language).
- options_en: An array of exactly 4 option strings in English.
- options_hi: An array of exactly 4 option strings in Hindi.
- correctAnswer: The exact string text of the correct option (MUST match one of the items in the options array exactly).
- correctIndex: The 0-based index of the correct option in the options array (0 for the first option, 1 for the second, 2 for the third, 3 for the fourth).
- explanation: A detailed explanation in English of the solution or reasoning.
- explanation_hi: A detailed explanation in Hindi of the solution or reasoning.
- category: The exam category/class (e.g. SSC, Banking, JEE, NEET, CUET, UPSC, Class 9, Class 10, etc.). Attempt to detect this from the PDF contents. If not found, use "${defaults.category || 'General'}".
- subject: The subject name (e.g. Mathematics, Physics, Chemistry, Biology, History, Geography, English, Reasoning, General Knowledge, etc.). Attempt to detect this from the PDF. If not found, use "${defaults.subject || 'General'}".
- topic: The specific topic/chapter of the question if detectable (otherwise empty or General).
- difficulty: One of "Easy", "Medium", "Hard" (estimate based on complexity).
- isMockTestOnly: false

Return the output ONLY as a valid JSON array of these objects. Do not include markdown code block syntax like \`\`\`json. Return only the raw JSON.`;

    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
        try {
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [pdfPart, { text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const text = response.response.text();
            let cleanText = text.trim();
            if (cleanText.startsWith('```')) {
                // strip starting fence
                cleanText = cleanText.replace(/^```(?:json)?\n?/, '');
                // strip ending fence
                cleanText = cleanText.replace(/\n?```$/, '');
                cleanText = cleanText.trim();
            }

            const parsed = JSON.parse(cleanText);
            if (!Array.isArray(parsed)) {
                throw new Error('Gemini response is not a JSON array.');
            }
            return parsed;
        } catch (e) {
            retries--;
            console.error(`[Gemini API] Error during question extraction (retries remaining: ${retries}):`, e.message);
            if (retries === 0) {
                throw new Error('Failed to parse questions JSON from Gemini response after 3 attempts: ' + e.message);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

module.exports = {
    extractQuestionsFromPdf
};
