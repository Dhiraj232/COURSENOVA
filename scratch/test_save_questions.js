const http = require('http');

async function run() {
    // 1. Get Admin Token
    const loginPayload = JSON.stringify({
        email: 'coursenova.in@gmail.com',
        password: 'Coursenova@Admin#2026'
    });

    const token = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
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
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(loginPayload);
        req.end();
    });

    console.log("Obtained Admin Token");

    // 2. Prepare 100 mock questions
    const questions = [];
    for (let i = 0; i < 100; i++) {
        questions.push({
            question: `What is 2 + 2? Question ${i}`,
            question_en: `What is 2 + 2? Question ${i}`,
            question_hi: "",
            options: ["3", "4", "5", "6"],
            options_en: ["3", "4", "5", "6"],
            options_hi: [],
            correctAnswer: "4",
            category: "Mock Test",
            subject: "Mathematics",
            questionNumber: i + 1,
            isMockTestOnly: true
        });
    }
    const questionsPayload = JSON.stringify(questions);

    // 3. Post to /api/admin/questions
    console.log("Sending save request for 100 questions to /api/admin/questions...");
    console.time("Insert 100 questions");
    const res = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
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
    console.timeEnd("Insert 100 questions");

    console.log("Response status:", res.statusCode);
    console.log("Response count:", JSON.parse(res.body).count);
}

run().catch(console.error);
