const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testTranslation() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const questionText = "Choose the correct order of electrical resistivity of metals.";
        const options = [
            "A g > W > N i > H g",
            "H g > N i > W > A g",
            "A g > N i > H g > W",
            "A g > W > H g > N i RRB Group-D Previous Papers (download PDF)"
        ];

        const prompt = `You are a professional Hindi translator for educational exams.
Translate the following English exam question, options, and explanation (if provided) into natural, grammatically correct, and standard academic Hindi.
For options, translate each option in the list. Ensure the translated options list has the exact same number of items and order as the English options.
For mathematical formulas or terms, keep them in LaTeX (e.g. $x^2$ or \\frac{a}{b}) if they are in LaTeX, or write them naturally.

Input Data:
- Question: "${questionText.replace(/"/g, '\\"')}"
- Options: ${JSON.stringify(options || [])}

Return the translation ONLY as a valid JSON object with these exact fields:
- question_hi: (string) The Hindi translated question text
- options_hi: (array of strings) The Hindi translated options in the same order
- explanation_hi: (string, optional) The Hindi translated explanation

Do NOT include any markdown code block formatting (like \`\`\`json). Return only the raw JSON.`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        console.log('Gemini raw response:');
        console.log(text);
    } catch (err) {
        console.error(err);
    }
}

testTranslation();
