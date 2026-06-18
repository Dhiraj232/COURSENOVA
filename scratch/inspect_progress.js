require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const progressList = await CourseProgress.find({});
    console.log(`\nFound ${progressList.length} progress records in DB:`);
    for (const p of progressList) {
        console.log(`- User: ${p.userId}, Course: ${p.courseId}, Completed Lessons: ${p.completedLessons.join(', ')}, Video Watched: ${p.videoWatched}, PDF Read: ${p.pdfRead}`);
    }

    await mongoose.disconnect();
}

run().catch(console.error);
