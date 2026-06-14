const mongoose = require('mongoose');
require('dotenv').config();

const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB.');

    const enrollments = await Enrollment.find().lean();
    console.log(`Found ${enrollments.length} enrollments in DB:`);
    for (const e of enrollments) {
        console.log(`- User: ${e.userId}, CourseId: ${e.courseId}, Name: "${e.courseName}", Date: ${e.purchaseDate}`);
    }

    const users = await User.find({}, 'name email enrolledCourses purchasedCourses').lean();
    console.log(`\nFound ${users.length} users in DB:`);
    for (const u of users) {
        console.log(`- User: ${u.name} (${u.email})`);
        console.log(`  Enrolled Courses:`, u.enrolledCourses);
        console.log(`  Purchased Courses:`, u.purchasedCourses);
    }

    process.exit(0);
}
run();
