/**
 * seed_platform_content.js
 * Bulk seeding script for Renvox AI platform
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

const coursesToSeed = [
    // FREE COURSES (6)
    { slug: 'python-basics', title: 'Python for Absolute Beginners', icon: '🐍', price: 0, isFree: true, isPremium: false, category: 'Coding' },
    { slug: 'intro-ai', title: 'Introduction to Renvox AI', icon: '🤖', price: 0, isFree: true, isPremium: false, category: 'AI' },
    { slug: 'web-101', title: 'Web Development 101', icon: '🌐', price: 0, isFree: true, isPremium: false, category: 'Web' },
    { slug: 'soft-skills', title: 'Effective Communication', icon: '🗣️', price: 0, isFree: true, isPremium: false, category: 'General' },
    { slug: 'digital-literacy', title: 'Digital Literacy Essentials', icon: '💻', price: 0, isFree: true, isPremium: false, category: 'Tech' },
    { slug: 'logic-puzzle', title: 'Logical Reasoning Mastery', icon: '🧩', price: 0, isFree: true, isPremium: false, category: 'Aptitude' },

    // PAID COURSES (8, ₹99)
    { slug: 'adv-python', title: 'Advanced Python Algorithms', icon: '⚡', price: 99, isFree: false, isPremium: true, category: 'Coding' },
    { slug: 'mern-bootcamp', title: 'Full Stack MERN Bootcamp', icon: '🎨', price: 99, isFree: false, isPremium: true, category: 'Web' },
    { slug: 'data-science-pro', title: 'Data Science & Visualisation', icon: '📊', price: 99, isFree: false, isPremium: true, category: 'Data' },
    { slug: 'ui-ux-pro', title: 'UI/UX Professional Course', icon: '✏️', price: 99, isFree: false, isPremium: true, category: 'Design' },
    { slug: 'cyber-sec', title: 'Cyber Security Fundamentals', icon: '🛡️', price: 99, isFree: false, isPremium: true, category: 'Security' },
    { slug: 'aws-cloud', title: 'Cloud Computing with AWS', icon: '☁️', price: 99, isFree: false, isPremium: true, category: 'Cloud' },
    { slug: 'flutter-app', title: 'App Development with Flutter', icon: '📱', price: 99, isFree: false, isPremium: true, category: 'Mobile' },
    { slug: 'startup-101', title: 'Founding Your First Startup', icon: '🚀', price: 99, isFree: false, isPremium: true, category: 'Business' }
];

const mockTestsToSeed = [
    // FREE MOCK TESTS (7)
    { id: 'aptitude-free', title: 'General Aptitude Free Test', category: 'General', price: 0, isFree: true },
    { id: 'ssc-gd-free', title: 'SSC GD 2025 Free Mock', category: 'SSC', price: 0, isFree: true },
    { id: 'jee-phys-free', title: 'JEE Mains Physics Sample', category: 'JEE', price: 0, isFree: true },
    { id: 'neet-bio-free', title: 'NEET Biology Foundation', category: 'NEET', price: 0, isFree: true },
    { id: 'ibps-clerk-free', title: 'IBPS RRB Clerk Free Mock', category: 'Banking', price: 0, isFree: true },
    { id: 'cuet-gen-free', title: 'CUET 2025 General Test', category: 'CUET', price: 0, isFree: true },
    { id: 'upsc-csat-free', title: 'UPSC CSAT Logic Test', category: 'UPSC', price: 0, isFree: true },

    // PAID MOCK TESTS (8, ₹59)
    { id: 'jee-adv-pro', title: 'JEE Advanced High-Performers', category: 'JEE', price: 59, isFree: false },
    { id: 'neet-full-2025', title: 'NEET 2025 Full Syllabus Prep', category: 'NEET', price: 59, isFree: false },
    { id: 'upsc-prelims-1', title: 'UPSC GS Prelims Mock 1', category: 'UPSC', price: 59, isFree: false },
    { id: 'ssc-cgl-tier2', title: 'SSC CGL Tier 2 Pro Test', category: 'SSC', price: 59, isFree: false },
    { id: 'ibps-po-mains', title: 'IBPS PO 2025 Mains Target', category: 'Banking', price: 59, isFree: false },
    { id: 'cat-quant-master', title: 'CAT Quant Master Series', category: 'CAT', price: 59, isFree: false },
    { id: 'gate-cse-2025', title: 'GATE CSE 2025 Full Length Mock', category: 'GATE', price: 59, isFree: false },
    { id: 'clat-legal-pro', title: 'CLAT Legal & Logic Special', category: 'CLAT', price: 59, isFree: false }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // Seed Courses
        console.log(`Seeding ${coursesToSeed.length} courses...`);
        for (const c of coursesToSeed) {
            await Course.updateOne(
                { slug: c.slug },
                { 
                    $set: { 
                        ...c, 
                        description: `A comprehensive ${c.title} course designed for RENVOX learners.`,
                        duration: '4-8 Weeks',
                        level: 'Beginner',
                        lessons: [
                            { lessonId: 'l1', title: 'Introduction', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
                            { lessonId: 'l2', title: 'Core Concepts', videoUrl: 'https://www.youtube.com/embed/3JZ_D3iQX3A' }
                        ],
                        quizQuestions: [
                            { question: 'What is the primary goal of this course?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 0 },
                            { question: 'Who is this course for?', options: ['Beginners', 'Experts', 'Everyone', 'Cats'], correctIndex: 2 }
                        ]
                    } 
                },
                { upsert: true }
            );
        }
        console.log('✅ Courses seeded.');

        // Seed Mock Tests
        console.log(`Seeding ${mockTestsToSeed.length} mock tests...`);
        for (const t of mockTestsToSeed) {
            await MockTestPack.updateOne(
                { id: t.id },
                { $set: { ...t, description: `High-quality ${t.title} series with detailed analysis.` } },
                { upsert: true }
            );
        }
        console.log('✅ Mock tests seeded.');

        console.log('🎉 SEEDING COMPLETE!');
        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
