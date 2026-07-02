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

    // 2. Prepare 2 mock questions
    const questions = [];
    for (let i = 0; i < 2; i++) {
        questions.push({
            question: `What is 10 + 10? Question ${i}`,
            question_en: `What is 10 + 10? Question ${i}`,
            question_hi: "",
            options: ["10", "20", "30", "40"],
            options_en: ["10", "20", "30", "40"],
            options_hi: [],
            correctAnswer: "20",
            category: "Mock Test",
            subject: "Mathematics",
            questionNumber: i + 1,
            isMockTestOnly: true
        });
    }
    const questionsPayload = JSON.stringify(questions);

    // 3. Post to /api/admin/questions
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

    console.log("Response body:");
    const body = JSON.parse(res.body);
    console.log(JSON.stringify(body, null, 2));
    
    if (body.questions && body.questions.length > 0) {
        console.log("Sample question keys:", Object.keys(body.questions[0]));
        console.log("Sample question _id:", body.questions[0]._id);
    }
}

run().catch(console.error);
