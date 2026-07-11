const mongoose = require('mongoose');
require('dotenv').config();
const PracticeQuestion = require('../models/PracticeQuestion');

async function search() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const results = await PracticeQuestion.find({
            $or: [
                { question: { $regex: /\[Hindi/i } },
                { question_hi: { $regex: /\[Hindi/i } }
            ]
        });
        
        console.log(`Found ${results.length} questions containing "[Hindi"`);
        if (results.length > 0) {
            console.log('Sample matching question:', JSON.stringify(results[0], null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
search();
