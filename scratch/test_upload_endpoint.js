const http = require('http');
const PDFDocument = require('pdfkit');

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

    console.log("Obtained Admin Token:", token.substring(0, 20) + "...");

    // 2. Generate PDF in memory
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    const pdfBuffer = await new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.text("Q1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B", 100, 100);
        doc.end();
    });

    console.log("Generated test PDF, size:", pdfBuffer.length);

    // 3. Upload to /api/admin/generate-questions-from-pdf
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Construct Multipart body manually
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const multipartBody = Buffer.concat([
        Buffer.from(header, 'utf8'),
        pdfBuffer,
        Buffer.from(footer, 'utf8')
    ]);

    console.log("Sending upload request to /api/admin/generate-questions-from-pdf...");
    const res = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/admin/generate-questions-from-pdf?expectedCount=1',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': multipartBody.length
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
        req.write(multipartBody);
        req.end();
    });

    console.log("Upload response status:", res.statusCode);
    console.log("Upload response body:", res.body);
}

run().catch(console.error);
