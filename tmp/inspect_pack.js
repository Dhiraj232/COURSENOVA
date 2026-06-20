require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');
const PracticeQuestion = require('../models/PracticeQuestion');

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova');
        console.log("Connected to MongoDB");

        const pack = await MockTestPack.findOne({ id: 'ssc-gd-free' }).populate('tests.questions');
        if (!pack) {
            console.log("Pack ssc-gd-free not found!");
            process.exit(1);
        }

        console.log(`Pack Title: ${pack.title}`);
        console.log(`Total Tests: ${pack.tests.length}`);

        pack.tests.forEach((test, idx) => {
            console.log(`\nTest [${idx + 1}]: ${test.testTitle} (${test.testId})`);
            console.log(`Questions Count: ${test.questions.length}`);
            
            // Print the first 5 questions of this test
            console.log("First 5 Questions:");
            test.questions.slice(0, 5).forEach((q, qIdx) => {
                console.log(`  Q${qIdx + 1}: ID: ${q._id}`);
                console.log(`     Text (EN): "${q.question_en}"`);
                console.log(`     Text (HI): "${q.question_hi}"`);
                console.log(`     Options: ${JSON.stringify(q.options)}`);
                console.log(`     Correct: "${q.correctAnswer}"`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

inspect();
