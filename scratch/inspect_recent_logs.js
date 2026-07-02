require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const MockTestPack = require('../models/MockTestPack');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        console.log('--- RECENT AUDIT LOGS ---');
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(10);
        logs.forEach(l => {
            console.log(`[${l.createdAt.toISOString()}] Email: ${l.adminEmail} | Action: ${l.action} | TargetModel: ${l.targetModel} | Details: ${JSON.stringify(l.details)}`);
        });

        console.log('\n--- RECENT MOCK TEST PACK UPDATES ---');
        const packs = await MockTestPack.find().sort({ updatedAt: -1 }).limit(5);
        packs.forEach(p => {
            console.log(`[${p.updatedAt ? p.updatedAt.toISOString() : 'N/A'}] Pack: "${p.title}" (${p.id}) | Tests: ${p.tests.length}`);
            p.tests.forEach(t => {
                console.log(`  Test: "${t.testTitle}" | Questions linked: ${t.questions.length} | numQuestions: ${t.numQuestions}`);
            });
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
