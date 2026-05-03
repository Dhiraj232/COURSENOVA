const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkData() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const TestResult = mongoose.model('TestResult', new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: Number,
        courseId: String
    }));

    const User = mongoose.model('User', new mongoose.Schema({
        name: String,
        email: String
    }));

    const results = await TestResult.find().populate('userId').limit(10);
    console.log('--- Sample Test Results ---');
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
}

checkData();
