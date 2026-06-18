require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Course = require('../models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const c1 = await Course.findOne({ slug: 'building positive attitude' });
    if (c1) {
        console.log('Course: building positive attitude');
        console.log(JSON.stringify(c1.lessons, null, 2));
    }

    const c2 = await Course.findOne({ slug: 'ai basics for beginners' });
    if (c2) {
        console.log('Course: ai basics for beginners');
        console.log(JSON.stringify(c2.lessons, null, 2));
    }

    await mongoose.disconnect();
}

run().catch(console.error);
