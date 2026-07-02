const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');
const MONGO_URI = 'mongodb+srv://coursenovain_db_user:coursenova123@cluster0.xnokxr5.mongodb.net/coursenova?retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const packs = await MockTestPack.find({});
        console.log("Found", packs.length, "packs:");
        packs.forEach(p => {
            console.log(`\nPack: ${p.title} (${p.id})`);
            console.log(`- totalTests: ${p.totalTests}`);
            console.log(`- totalQuestions: ${p.totalQuestions}`);
            console.log(`- totalMarks: ${p.totalMarks}`);
            console.log(`- durationMinutes: ${p.durationMinutes}`);
            console.log(`- tests:`);
            p.tests.forEach(t => {
                console.log(`  * Subtest: ${t.testTitle} (${t.testId})`);
                console.log(`    - numQuestions: ${t.numQuestions}`);
                console.log(`    - totalMarks: ${t.totalMarks}`);
                console.log(`    - durationMinutes: ${t.durationMinutes}`);
                console.log(`    - Questions array length: ${t.questions.length}`);
            });
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
