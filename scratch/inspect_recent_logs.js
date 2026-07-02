require('dotenv').config();
const mongoose = require('mongoose');
const PdfJob = require('../models/PdfJob');

async function main() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://coursenovain_db_user:coursenova123@cluster0.xnokxr5.mongodb.net/coursenova?retryWrites=true&w=majority');
    
    try {
        console.log('--- RECENT PDF JOBS ---');
        const jobs = await PdfJob.find().sort({ createdAt: -1 }).limit(5);
        jobs.forEach(j => {
            console.log(`\n===================================`);
            console.log(`Job ID: ${j.jobId} | Type: ${j.type} | Status: ${j.status}`);
            console.log(`Created: ${j.createdAt.toISOString()}`);
            console.log(`Progress: ${j.progress}% | Stage: ${j.stage}`);
            console.log(`Error: ${j.error}`);
            console.log(`Result: ${JSON.stringify(j.result)}`);
            console.log(`Logs:`);
            j.logs.forEach(l => console.log(`  ${l}`));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
