/**
 * total_purge_to_1rs.js
 * 1. Deletes EVERY course.
 * 2. Deletes EVERY mock test pack.
 * 3. Adds exactly ONE ₹1 course.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

const singleCourse = {
    slug: 'coursenova-ai-masterclass',
    title: 'CourseNova Masterclass',
    icon: '🚀',
    description: 'A complete guided masterclass on using CourseNova to its full potential. Includes hands-on projects and a verified certificate.',
    price: 1, // SPECIAL ₹1 PER THE USER'S REQUEST
    isPremium: true,
    isFree: false,
    duration: '1 Week',
    level: 'Beginner',
    isActive: true,
    lessons: [
        { 
            lessonId: 'rm-l1', 
            title: 'Welcome to CourseNova', 
            videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0',
            pdfUrl: 'coursenova_guide.pdf', 
            order: 1 
        }
    ],
    quizQuestions: [
        { 
            question: 'What is the primary goal of CourseNova?', 
            options: ['To help you learn', 'To play games', 'To watch movies', 'None'], 
            correctIndex: 0 
        }
    ]
};

async function totalPurge() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Delete ALL courses
        const delCourses = await Course.deleteMany({});
        console.log(`✅ Purged ${delCourses.deletedCount} courses.`);

        // 2. Delete ALL mock tests
        const delPacks = await MockTestPack.deleteMany({});
        console.log(`✅ Purged ${delPacks.deletedCount} mock test packs.`);

        // 3. Add the single ₹1 Masterclass
        const finalCourse = new Course(singleCourse);
        await finalCourse.save();
        console.log(`✅ SUCCESS: Added "${singleCourse.title}" (Price: ₹${singleCourse.price}) as the only active item.`);

        console.log('\n🎉 TOTAL RESET COMPLETE: No other courses or mock tests remain.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Purge error:', err.message);
        process.exit(1);
    }
}

totalPurge();
