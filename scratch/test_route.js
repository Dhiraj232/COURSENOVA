require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courseId = 'java-in-1-shot';
    
    const orQuery = [
        { title: courseId },
        { slug: courseId.toLowerCase().replace(/\s+/g, '-') }
    ];
    if (String(courseId).match(/^[0-9a-fA-F]{24}$/)) {
        orQuery.push({ _id: courseId });
    }
    
    const course = await Course.findOne({ $or: orQuery });
    console.log("Course found:", course ? "Yes" : "No");
    
    if (course) {
        console.log("Lessons count:", course.lessons ? course.lessons.length : 0);
    }
    
    process.exit(0);
}

test();
