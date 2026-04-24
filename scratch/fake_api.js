require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const { checkAccess } = require('../utils/accessControl');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courseId = 'java-in-1-shot';
    const userId = 'dummy_user_id';
    
    // Enforce Access Check
    const hasAccess = await checkAccess(userId, courseId);
    if (!hasAccess) {
        console.log(JSON.stringify({ ok: false, message: 'Access denied. Please enroll to view course content.' }, null, 2));
        process.exit(0);
    }

    const orQuery = [
        { title: courseId },
        { slug: courseId.toLowerCase().replace(/\s+/g, '-') }
    ];
    if (String(courseId).match(/^[0-9a-fA-F]{24}$/)) {
        orQuery.push({ _id: courseId });
    }
    
    const course = await Course.findOne({ $or: orQuery });

    const progress = await CourseProgress.findOne({ userId, courseId });

    console.log(JSON.stringify({
        ok: true,
        course: course ? {
            _id: course._id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            icon: course.icon,
            lessons: course.lessons || [],
            quizQuestions: course.quizQuestions || [],
            videoUrl: course.videoUrl,
            pdfUrl: course.pdfUrl
        } : null,
        progress: progress ? {
            progressPercent: progress.progressPercent,
            completedLessons: progress.completedLessons,
            videoWatched: progress.videoWatched,
            pdfRead: progress.pdfRead,
            isCompleted: progress.isCompleted,
            testPassed: progress.testPassed,
            certId: progress.certId
        } : null
    }, null, 2));

    process.exit(0);
}

test();
