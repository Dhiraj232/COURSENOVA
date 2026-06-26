require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

// Generate admin token
const token = jwt.sign(
    { userId: '507f1f0873e7900000000001', role: 'admin', email: 'admin@coursenova.in' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function verify() {
    console.log('Connecting to MongoDB to find a mock test pack...');
    await mongoose.connect(process.env.MONGO_URI);
    let pack = await MockTestPack.findOne();
    if (!pack) {
        console.log('No MockTestPack found. Creating a temporary test pack...');
        pack = await MockTestPack.create({
            title: 'SSC GD Mock Test Series',
            id: 'ssc-gd-series',
            category: 'SSC GD',
            price: 0,
            isActive: true,
            description: 'Temporary Test Pack',
            tests: [
                {
                    testTitle: 'Set 1 Full Test',
                    testId: 'set-1-full-test',
                    durationMinutes: 60,
                    questions: []
                }
            ]
        });
    }
    const packId = pack.id;
    const testId = pack.tests[0].testId;
    console.log(`Using Pack ID: ${packId}, Test ID: ${testId}`);
    await mongoose.disconnect();

    console.log('Starting Express server...');
    const serverProcess = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: '5000' }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[Server Stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Stderr] ${data.toString().trim()}`);
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 8000));

    try {
        console.log('Sending PDF import questions background request...');
        const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD Constable Shift 1 English.pdf';
        const fileBuffer = fs.readFileSync(pdfPath);
        
        // Native FormData
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('pdf', blob, 'SSC GD Constable Shift 1 English.pdf');
        formData.append('category', 'SSC GD');
        formData.append('subject', 'Reasoning');
        formData.append('packId', packId);
        formData.append('testId', testId);

        let importRes = null;
        let retries = 5;
        while (retries > 0) {
            try {
                importRes = await fetch('http://localhost:5000/api/admin/import-pdf-questions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                break; // success
            } catch (fetchErr) {
                console.warn(`Connection failed, retrying in 2 seconds... (${retries} retries left)`);
                retries--;
                if (retries === 0) throw fetchErr;
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        if (!importRes.ok) {
            const errText = await importRes.text();
            throw new Error(`Upload failed: ${importRes.status} ${errText}`);
        }

        const importData = await importRes.json();
        console.log('Import Response:', importData);

        if (!importData.ok || !importData.jobId) {
            throw new Error('Import request did not return a jobId!');
        }

        const jobId = importData.jobId;
        console.log(`Polling status for Job ID: ${jobId}`);

        let jobCompleted = false;
        let attempts = 0;
        while (!jobCompleted && attempts < 60) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;

            const statusRes = await fetch(`http://localhost:5000/api/admin/pdf-jobs/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!statusRes.ok) {
                const errText = await statusRes.text();
                console.error(`Status check failed: ${statusRes.status} ${errText}`);
                continue;
            }

            const job = await statusRes.json();
            console.log(`[Attempt ${attempts}] Status: ${job.status}, Progress: ${job.progress}%, Stage: ${job.stage}`);

            if (job.status === 'completed') {
                jobCompleted = true;
                console.log('Job completed successfully! Result summary:', job.result);
                break;
            } else if (job.status === 'failed') {
                throw new Error(`Job failed: ${job.error}`);
            }
        }

        if (!jobCompleted) {
            throw new Error('Verification timed out after 60 seconds.');
        }

        console.log('All checks passed successfully!');
    } catch (err) {
        console.error('Verification failed:', err);
        process.exitCode = 1;
    } finally {
        console.log('Stopping Express server...');
        serverProcess.kill();
    }
}

verify();
