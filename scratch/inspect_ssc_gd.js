require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const pack = await MockTestPack.findOne({ id: 'ssc-gd-free' }).populate('tests.questions');
        if (!pack) {
            console.log('MockTestPack ssc-gd-free not found!');
            return;
        }
        
        console.log(`Pack ID: ${pack.id}`);
        console.log(`Pack Title: ${pack.title}`);
        console.log(`Tests count: ${pack.tests.length}`);
        
        pack.tests.forEach((t, i) => {
            console.log(`\nTest #${i + 1}:`);
            console.log(`  testId: ${t.testId}`);
            console.log(`  testTitle: ${t.testTitle}`);
            console.log(`  numQuestions (stored): ${t.numQuestions}`);
            console.log(`  questions populated: ${t.questions.length}`);
            if (t.questions.length > 0) {
                console.log(`  Sample Q1: ${t.questions[0].question}`);
            }
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
