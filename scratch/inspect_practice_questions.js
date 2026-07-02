require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const count = await PracticeQuestion.countDocuments();
        console.log(`Total questions in DB: ${count}`);
        
        const mockCount = await PracticeQuestion.countDocuments({ isMockTestOnly: true });
        console.log(`Mock Test Only questions in DB: ${mockCount}`);
        
        const sampleQs = await PracticeQuestion.find().limit(5);
        sampleQs.forEach((q, i) => {
            console.log(`Sample #${i + 1}: ${q.question} | Category: ${q.category} | Subject: ${q.subject}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
