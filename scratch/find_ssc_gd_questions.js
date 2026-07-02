require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const total = await PracticeQuestion.countDocuments();
        console.log(`Total questions in DB: ${total}`);

        const matchCategory = await PracticeQuestion.find({ category: /Govt/i }).limit(5);
        console.log(`\nFound ${matchCategory.length} questions matching category /Govt/i:`);
        matchCategory.forEach((q, i) => {
            console.log(`  #${i+1}: ${q.question} | Cat: ${q.category} | Sub: ${q.subject}`);
        });

        const matchSubject = await PracticeQuestion.find({ subject: /Set 1/i }).limit(5);
        console.log(`\nFound ${matchSubject.length} questions matching subject /Set 1/i:`);
        matchSubject.forEach((q, i) => {
            console.log(`  #${i+1}: ${q.question} | Cat: ${q.category} | Sub: ${q.subject}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
