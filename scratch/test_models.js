require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        console.log('Calling gemini-flash-latest...');
        const result = await model.generateContent('Hello');
        console.log('Result:', result.response.text());
    } catch (err) {
        console.error('Error during call:', err);
    }
}

main();
