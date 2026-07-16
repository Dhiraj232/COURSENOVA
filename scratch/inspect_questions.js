const mongoose = require('mongoose');
require('dotenv').config();
const MockTestPack = require('../models/MockTestPack');
const PracticeQuestion = require('../models/PracticeQuestion');

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const pack = await MockTestPack.findOne({ id: 'bihar-12-paid' });
        if (!pack) {
            console.log("bihar-12-paid pack not found");
            process.exit(1);
        }
        console.log("Pack title:", pack.title);
        for (const test of pack.tests) {
            console.log(`\nTest Title: "${test.testTitle}" | testId: "${test.testId}" | Questions count: ${test.questions.length}`);
            const qs = await PracticeQuestion.find({ _id: { $in: test.questions } });
            const subjects = [...new Set(qs.map(q => q.subject))];
            const categories = [...new Set(qs.map(q => q.category))];
            console.log("   - Subjects in DB for these questions:", subjects);
            console.log("   - Categories in DB for these questions:", categories);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
inspect();
