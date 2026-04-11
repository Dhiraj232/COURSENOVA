/**
 * seed_final_v3.js
 * Round 3 bulk seeding for CourseNova platform
 * Focus: English & Professional Skills
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const finalCourses = [
    // FREE COURSES (8)
    { slug: 'english-grammar-basic', title: 'English Grammar Foundations', icon: '📝', price: 0, isFree: true, isPremium: false, category: 'English' },
    { slug: 'daily-vocab', title: 'Daily Vocabulary Builder', icon: '📖', price: 0, isFree: true, isPremium: false, category: 'English' },
    { slug: 'spoken-english-interviews', title: 'Spoken English for Interviews', icon: '🎙️', price: 0, isFree: true, isPremium: false, category: 'English' },
    { slug: 'creative-writing-intro', title: 'Creative Writing & Storytelling', icon: '🖋️', price: 0, isFree: true, isPremium: false, category: 'Skills' },
    { slug: 'public-speaking-pro-free', title: 'Public Speaking Mastery', icon: '🎤', price: 0, isFree: true, isPremium: false, category: 'Skills' },
    { slug: 'career-mentorship-free', title: 'Career Guidance & Mentorship', icon: '🛤️', price: 0, isFree: true, isPremium: false, category: 'Career' },
    { slug: 'speed-math-v3', title: 'Speed Math & Mental Calculation', icon: '🧮', price: 0, isFree: true, isPremium: false, category: 'Aptitude' },
    { slug: 'canva-design-free', title: 'Graphic Design with Canva', icon: '🎨', price: 0, isFree: true, isPremium: false, category: 'Design' },

    // PAID COURSES (8, ₹99)
    { slug: 'adv-english-pro', title: 'Advanced English Proficiency', icon: '🎓', price: 99, isFree: false, isPremium: true, category: 'English' },
    { slug: 'ielts-toefl-master', title: 'IELTS & TOEFL Master Guide', icon: '🌎', price: 99, isFree: false, isPremium: true, category: 'English' },
    { slug: 'comp-english-exams', title: 'English for Competitive Exams', icon: '🏆', price: 99, isFree: false, isPremium: true, category: 'English' },
    { slug: 'biz-analytics-special', title: 'Business Analytics Specialization', icon: '📈', price: 99, isFree: false, isPremium: true, category: 'Business' },
    { slug: 'mern-architecture-pro', title: 'MERN Stack Architecture', icon: '🎨', price: 99, isFree: false, isPremium: true, category: 'Web' },
    { slug: 'nextjs-master-pro', title: 'Full Stack Next.js Mastery', icon: '⚛️', price: 99, isFree: false, isPremium: true, category: 'Web' },
    { slug: 'ai-biz-automation', title: 'Business Automation with AI', icon: '🤖', price: 99, isFree: false, isPremium: true, category: 'AI' },
    { slug: 'fb-google-ads-pro', title: 'Facebook & Google Ads Mastery', icon: '📣', price: 99, isFree: false, isPremium: true, category: 'Marketing' }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        console.log(`Seeding ${finalCourses.length} additional courses (Round 3)...`);
        for (const c of finalCourses) {
            await Course.updateOne(
                { slug: c.slug },
                { 
                    $set: { 
                        ...c, 
                        description: `A masterclass in ${c.title} designed by COURSENOVA experts. Boost your career with these highly specialized ${c.category} skills.`,
                        duration: '4-10 Weeks',
                        level: 'Advanced',
                        isActive: true,
                        lessons: [
                            { lessonId: 'l1', title: 'Introduction & Basics', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
                            { lessonId: 'l2', title: 'Deep Dive Mastery', videoUrl: 'https://www.youtube.com/embed/3JZ_D3iQX3A' }
                        ],
                        quizQuestions: [
                            { question: 'What is the primary focus of this course?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 2 },
                            { question: 'Why choose COURSENOVA?', options: ['Quality', 'Excellence', 'Everything', 'None'], correctIndex: 2 }
                        ]
                    } 
                },
                { upsert: true }
            );
        }

        console.log('🎉 ROUND 3 SEEDING COMPLETE!');
        
        const count = await Course.countDocuments();
        console.log(`🚀 TOTAL COURSES IN DATABASE: ${count}`);

        process.exit(0);

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
        process.exit(1);
    }
}

seed();
