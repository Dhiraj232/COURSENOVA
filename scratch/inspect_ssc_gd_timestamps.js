require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const questions = await PracticeQuestion.find({ subject: /Set 1/i }).sort({ createdAt: -1 });
        console.log(`Found ${questions.length} questions matching /Set 1/i:`);
        questions.forEach((q, i) => {
            console.log(`  #${i+1}: _id: ${q._id} | Question: ${q.question.substring(0, 40)}... | CreatedAt: ${q.createdAt.toISOString()}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
