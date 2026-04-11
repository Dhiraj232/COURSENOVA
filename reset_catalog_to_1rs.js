/**
 * reset_catalog_to_1rs.js
 * Deletes EVERY course currently in the database and adds exactly ONE ₹1 course.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

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
            videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', // Real sample video
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

async function resetCatalog() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Delete ALL courses
        const delResult = await Course.deleteMany({});
        console.log(`✅ Permanently REMOVED ${delResult.deletedCount} courses from the catalog.`);

        // 2. Add the single ₹1 course
        const finalCourse = new Course(singleCourse);
        await finalCourse.save();
        console.log(`✅ SUCCESS: Added "${singleCourse.title}" (Price: ₹${singleCourse.price}) as the only active course.`);

        console.log('\n🎉 Catalog Reset Complete: Exactly 1 course remains.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset error:', err.message);
        process.exit(1);
    }
}

resetCatalog();
