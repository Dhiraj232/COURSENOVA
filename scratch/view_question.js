const mongoose = require('mongoose');
require('dotenv').config();

const PracticeQuestion = require('../models/PracticeQuestion');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const q = await PracticeQuestion.findOne({});
    console.log(JSON.stringify(q, null, 2));
    await mongoose.connection.close();
}

run().catch(console.error);
