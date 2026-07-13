require('dotenv').config();
const https = require('https');

async function main() {
    const token = process.env.GEMINI_API_KEY;
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response Headers:', res.headers);
            try {
                const parsed = JSON.parse(data);
                console.log('Parsed Response:', parsed);
            } catch (e) {
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('Request Error:', err.message);
    });
    req.end();
}

main();
