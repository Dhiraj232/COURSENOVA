require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const course = await Course.findOne({ slug: 'java-in-1-shot' });
    if (course) {
        console.log("Found:", course.title);
        console.log("Lesson 1 URL:", course.lessons[0].videoUrl);
    } else {
        console.log("Not found!");
    }
    process.exit(0);
}
check();
