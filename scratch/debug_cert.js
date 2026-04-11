const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function testCert() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova');
        console.log('✅ MongoDB connected');

        const CourseProgress = require('../models/CourseProgress');
        const User = require('../models/User');
        const Course = require('../models/Course');

        const certId = 'RENV-MNT2XBC8'; // From user screenshot
        console.log('Testing certId:', certId);

        const record = await CourseProgress.findOne({ certId, testPassed: true }).populate('userId', 'name email');
        
        if (!record) {
            console.log('❌ Record not found');
            process.exit(0);
        }

        console.log('✅ Record found:', record.courseId);
        console.log('✅ User populated:', record.userId ? record.userId.name : 'null');

        let displayCourseName = record.courseName;
        if (!displayCourseName || displayCourseName.length < 5) {
            console.log('Searching for course title...');
            const course = await Course.findOne({
                $or: [
                    { _id: String(record.courseId).match(/^[0-9a-fA-F]{24}$/) ? record.courseId : null },
                    { slug: record.courseId }
                ]
            });
            if (course) {
                displayCourseName = course.title;
                console.log('✅ Found course title:', displayCourseName);
            } else {
                console.log('⚠️ Course title not found for:', record.courseId);
            }
        }

        console.log('Final Details:', {
            fullName: record.userId ? record.userId.name : 'Professional Student',
            courseName: displayCourseName || record.courseId,
            completionDate: record.earnedAt || record.updatedAt,
            certId: record.certId
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ FATAL ERROR DURING TEST:', err);
        process.exit(1);
    }
}

testCert();
