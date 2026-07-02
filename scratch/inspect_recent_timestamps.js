require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const questions = await PracticeQuestion.find({ subject: /Set 1/i }).sort({ createdAt: -1 }).limit(20);
        console.log(`Recent 20 questions matching /Set 1/i:`);
        questions.forEach((q, i) => {
            console.log(`  #${i+1}: _id: ${q._id} | Question: ${q.question.substring(0, 45)}... | CreatedAt: ${q.createdAt.toISOString()}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
