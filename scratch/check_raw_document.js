require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const db = mongoose.connection.db;
        const packsCollection = db.collection('mocktestpacks');
        
        console.log('--- RAW MOCK TEST PACK DOCUMENTS ---');
        const packs = await packsCollection.find().toArray();
        packs.forEach(p => {
            console.log(`\nPack: "${p.title}" (${p.id})`);
            if (p.tests) {
                p.tests.forEach((t, i) => {
                    console.log(`  Test #${i+1}: "${t.testTitle}" | testId: "${t.testId}"`);
                    console.log(`    questions type: ${typeof t.questions} | isArray: ${Array.isArray(t.questions)}`);
                    console.log(`    questions raw:`, t.questions);
                    console.log(`    numQuestions:`, t.numQuestions);
                });
            }
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
