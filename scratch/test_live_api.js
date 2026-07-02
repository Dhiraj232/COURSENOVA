const https = require('https');

async function run() {
    // 1. Get Admin Token from Live Site
    const loginPayload = JSON.stringify({
        email: 'coursenova.in@gmail.com',
        password: 'Coursenova@Admin#2026'
    });

    const token = await new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'www.coursenova.in',
            path: '/api/auth/admin-login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginPayload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok && parsed.token) {
                        resolve(parsed.token);
                    } else {
                        reject(new Error("Login failed: " + data));
                    }
                } catch (e) {
                    console.log("Raw login response:", data);
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(loginPayload);
        req.end();
    });

    console.log("Obtained Live Admin Token");

    // 2. Prepare 2 mock questions with questionNumber
    const questions = [];
    for (let i = 0; i < 2; i++) {
        questions.push({
            question: `What is 100 + 100? Question ${i}`,
            question_en: `What is 100 + 100? Question ${i}`,
            question_hi: "",
            options: ["100", "200", "300", "400"],
            options_en: ["100", "200", "300", "400"],
            options_hi: [],
            correctAnswer: "200",
            category: "Mock Test",
            subject: "Mathematics",
            questionNumber: i + 1,
            isMockTestOnly: true
        });
    }
    const questionsPayload = JSON.stringify(questions);

    // 3. Post to https://coursenova.in/api/admin/questions
    const res = await new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'www.coursenova.in',
            path: '/api/admin/questions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(questionsPayload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });

        req.on('error', reject);
        req.write(questionsPayload);
        req.end();
    });

    console.log("Live Response status:", res.statusCode);
    console.log("Live Response body:", res.body);
}

run().catch(console.error);
