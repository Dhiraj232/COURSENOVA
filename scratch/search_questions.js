const mongoose = require('mongoose');
require('dotenv').config();
const PracticeQuestion = require('../models/PracticeQuestion');

async function search() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        // Search by part of the question text
        const q = await PracticeQuestion.findOne({
            question: { $regex: /electrical resistivity of metals/i }
        });
        
        if (q) {
            console.log('Found question:');
            console.log(JSON.stringify(q, null, 2));
        } else {
            console.log('Question not found by regex search.');
            
            // Let's count questions that have "[Hindi translation missing]"
            const countMissing = await PracticeQuestion.countDocuments({
                $or: [
                    { question: { $regex: /translation missing/i } },
                    { question_hi: { $regex: /translation missing/i } }
                ]
            });
            console.log('Number of questions containing "translation missing":', countMissing);
            
            if (countMissing > 0) {
                const sample = await PracticeQuestion.findOne({
                    $or: [
                        { question: { $regex: /translation missing/i } },
                        { question_hi: { $regex: /translation missing/i } }
                    ]
                });
                console.log('Sample missing translation question:', JSON.stringify(sample, null, 2));
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
search();
