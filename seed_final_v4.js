/**
 * seed_final_v4.js
 * Round 4 bulk seeding for CourseNova platform
 * Focus: Specialized English & Career Skills
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const round4Courses = [
    // FREE COURSES (4)
    { slug: 'english-grammar-special', title: 'English Grammar Foundations (Special)', icon: '📝', price: 0, isFree: true, isPremium: false, category: 'English' },
    { slug: 'email-writing-pro', title: 'Professional Email Writing', icon: '📧', price: 0, isFree: true, isPremium: false, category: 'Skills' },
    { slug: 'stock-market-basics', title: 'Stock Market for Beginners', icon: '📈', price: 0, isFree: true, isPremium: false, category: 'Finance' },
    { slug: 'sales-techniques-v1', title: 'Modern Sales Techniques', icon: '💰', price: 0, isFree: true, isPremium: false, category: 'Business' },

    // PAID COURSES (4, ₹99)
    { slug: 'tenses-verbs-mastery', title: 'Tenses & Verbs Mastery', icon: '🕰️', price: 99, isFree: false, isPremium: true, category: 'English' },
    { slug: 'ielts-speaking-booster', title: 'IELTS Speaking Booster', icon: '🗣️', price: 99, isFree: false, isPremium: true, category: 'English' },
    { slug: 'excel-formulas-adv', title: 'Advanced Excel Formulas', icon: '📊', price: 99, isFree: false, isPremium: true, category: 'Data' },
    { slug: 'gpt-content-strategy', title: 'Content Strategy with GPT', icon: '🤖', price: 99, isFree: false, isPremium: true, category: 'AI' }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        console.log(`Seeding ${round4Courses.length} additional courses (Round 4)...`);
        for (const c of round4Courses) {
            await Course.updateOne(
                { slug: c.slug },
                { 
                    $set: { 
                        ...c, 
                        description: `Master the art of ${c.title} with COURSENOVA professional curriculum. Practical insights guaranteed.`,
                        duration: '2-5 Weeks',
                        level: 'Beginner',
                        isActive: true,
                        lessons: [
                            { lessonId: 'intro-1', title: 'Welcome to the Course', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
                            { lessonId: 'module-1', title: 'Practical Session', videoUrl: 'https://www.youtube.com/embed/3JZ_D3iQX3A' }
                        ],
                        quizQuestions: [
                            { question: 'What is the first step in this practice?', options: ['Step 1', 'Step 2', 'Step 3', 'Step 4'], correctIndex: 0 },
                            { question: 'How do you define success in this field?', options: ['Growth', 'Hard work', 'Both', 'Luck'], correctIndex: 2 }
                        ]
                    } 
                },
                { upsert: true }
            );
        }

        console.log('🎉 ROUND 4 SEEDING COMPLETE!');
        const total = await Course.countDocuments();
        console.log(`🚀 PLATFORM TOTAL: ${total} COURSES`);

        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
