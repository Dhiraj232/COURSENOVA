/**
 * reset_to_minimal_courses.js
 * 1. Purges ALL existing courses and mock test packs.
 * 2. Seeds exactly ONE ₹1 course (Premium).
 * 3. Seeds exactly ONE ₹0 course (Free).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

const premiumCourse = {
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

const freeCourse = {
    slug: 'ai-prompt-engineering',
    title: 'Introduction to AI & Prompt Engineering',
    icon: '🤖',
    description: 'Learn the fundamentals of Artificial Intelligence and master the art of writing effective prompts for LLMs like ChatGPT and Claude.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    level: 'Beginner',
    isActive: true,
    lessons: [
      {
        lessonId: 'ai-l1',
        title: 'What is Generative AI?',
        videoUrl: 'https://www.youtube.com/embed/G2fqAlgmoPo',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      }
    ],
    quizQuestions: [
      { question: 'What does LLM stand for?', options: ['Large Language Model', 'Low Level Machine', 'Linked Logic Module', 'Local Language Map'], correctIndex: 0 }
    ]
};

async function resetCatalog() {
    try {
        if (!MONGO_URI) throw new Error('MONGO_URI is missing in .env');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Purge
        const delCourses = await Course.deleteMany({});
        console.log(`🗑️ Purged ${delCourses.deletedCount} courses.`);

        const delPacks = await MockTestPack.deleteMany({});
        console.log(`🗑️ Purged ${delPacks.deletedCount} mock test packs.`);

        // 2. Add ₹1 Course
        await Course.create(premiumCourse);
        console.log(`✅ Added Premium course: ${premiumCourse.title} (₹${premiumCourse.price})`);

        // 3. Add Free Course
        await Course.create(freeCourse);
        console.log(`✅ Added Free course: ${freeCourse.title} (₹${freeCourse.price})`);

        console.log('\n🎉 SUCCESS: Catalog reset to exactly 2 courses as requested.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset error:', err.message);
        process.exit(1);
    }
}

resetCatalog();
