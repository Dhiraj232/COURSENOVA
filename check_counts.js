const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Question = require('./models/Question');
const Leaderboard = require('./models/Leaderboard');
const PracticeQuestion = require('./models/PracticeQuestion');

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const qCount = await Question.countDocuments();
        const lCount = await Leaderboard.countDocuments();
        const pqCount = await PracticeQuestion.countDocuments();
        
        console.log(`Question Count: ${qCount}`);
        console.log(`Leaderboard Count: ${lCount}`);
        console.log(`PracticeQuestion Count: ${pqCount}`);
        
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkDB();
