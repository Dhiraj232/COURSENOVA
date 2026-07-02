require('dotenv').config();
const https = require('https');

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                    console.error('API Error:', parsed.error);
                } else {
                    console.log('Available Models:');
                    parsed.models.forEach(m => console.log(` - ${m.name} (supports: ${m.supportedGenerationMethods.join(', ')})`));
                }
            } catch (e) {
                console.error('Parse Error:', e.message);
                console.log('Raw response:', data);
            }
        });
    }).on('error', (err) => {
        console.error('Fetch Error:', err.message);
    });
}

main();
