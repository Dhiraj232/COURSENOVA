require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const courseSlug = 'building-positive-attitude';
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
        console.log(`Course not found for slug: ${courseSlug}`);
    } else {
        console.log(`Course found: ${course.title} (slug: ${course.slug})`);
        console.log(`Lessons count: ${course.lessons.length}`);
        console.log('Lessons IDs:', course.lessons.map(l => l.lessonId));
    }

    // Let's also print all courses to see what exists
    const allCourses = await Course.find({}, { title: 1, slug: 1, 'lessons.lessonId': 1 });
    console.log('\nAll courses in DB:');
    allCourses.forEach(c => {
        console.log(`- ${c.title} (slug: ${c.slug}), Lessons count: ${c.lessons.length}, Lesson IDs: ${c.lessons.map(l => l.lessonId).join(', ')}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
