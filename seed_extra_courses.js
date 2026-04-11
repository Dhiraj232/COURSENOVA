/**
 * seed_extra_courses.js
 * Additional bulk seeding for CourseNova platform
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const extraCourses = [
    // FREE COURSES (6)
    { slug: 'excel-data', title: 'Excel for Data Analytics', icon: '📊', price: 0, isFree: true, isPremium: false, category: 'Data' },
    { slug: 'git-github', title: 'Git & GitHub Crash Course', icon: '🐙', price: 0, isFree: true, isPremium: false, category: 'Coding' },
    { slug: 'js-dom', title: 'JavaScript DOM Manipulation', icon: '📜', price: 0, isFree: true, isPremium: false, category: 'Web' },
    { slug: 'ml-101', title: 'Machine Learning Foundations', icon: '🧠', price: 0, isFree: true, isPremium: false, category: 'AI' },
    { slug: 'public-speaking', title: 'Public Speaking Mastery', icon: '🎤', price: 0, isFree: true, isPremium: false, category: 'General' },
    { slug: 'time-hacks', title: 'Time Management Hacks', icon: '⏳', price: 0, isFree: true, isPremium: false, category: 'General' },

    // PAID COURSES (6, ₹99)
    { slug: 'react-adv', title: 'React JS Advanced Patterns', icon: '⚛️', price: 99, isFree: false, isPremium: true, category: 'Web' },
    { slug: 'node-deep-dive', title: 'Node.js & Express Deep Dive', icon: '🚀', price: 99, isFree: false, isPremium: true, category: 'Backend' },
    { slug: 'mongo-design', title: 'MongoDB Schema Design', icon: '💾', price: 99, isFree: false, isPremium: true, category: 'Database' },
    { slug: 'flutter-custom-ui', title: 'Custom Flutter UI Components', icon: '🧩', price: 99, isFree: false, isPremium: true, category: 'Mobile' },
    { slug: 'marketing-ai', title: 'Marketing Automation with AI', icon: '📈', price: 99, isFree: false, isPremium: true, category: 'Business' },
    { slug: 'crypto-chain', title: 'Crypto & Blockchain Fundamentals', icon: '🔗', price: 99, isFree: false, isPremium: true, category: 'Tech' }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        console.log(`Seeding ${extraCourses.length} additional courses...`);
        for (const c of extraCourses) {
            await Course.updateOne(
                { slug: c.slug },
                { 
                    $set: { 
                        ...c, 
                        description: `A specialized ${c.title} course to boost your career in ${c.category}.`,
                        duration: '3-6 Weeks',
                        level: 'Intermediate',
                        lessons: [
                            { lessonId: 'l1', title: 'Getting Started', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
                            { lessonId: 'l2', title: 'Practical Implementation', videoUrl: 'https://www.youtube.com/embed/3JZ_D3iQX3A' }
                        ],
                        quizQuestions: [
                            { question: 'What is the core focus of this module?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 1 },
                            { question: 'Who designed this curriculum?', options: ['Experts', 'AI', 'COURSENOVA Team', 'John Doe'], correctIndex: 2 }
                        ]
                    } 
                },
                { upsert: true }
            );
        }

        console.log('🎉 EXTRA SEEDING COMPLETE!');
        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
