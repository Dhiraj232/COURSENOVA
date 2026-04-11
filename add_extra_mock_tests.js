/**
 * add_extra_mock_tests.js
 * Adds 13 new mock test series (6 Free, 7 Paid @ ₹59-₹129) to the CourseNova platform.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova';

const newSeries = [
    // ─── NEW FREE SERIES (6) ───────────────────────────────────────────────────
    {
        id: 'upsc-mini-2026',
        title: 'UPSC IAS Mini Mock',
        category: 'UPSC',
        description: 'Starter mock test covering Geography and History basics for UPSC aspirants.',
        thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024adb0?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 5,
        isActive: true,
        tests: [{ testId: 'upsc-mini-1', testTitle: 'UPSC Fundamentals Test 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'banking-awareness-mini',
        title: 'Banking Awareness Mini Series',
        category: 'Banking',
        description: 'Essential mock tests for IBPS, SBI, and RBI exams.',
        thumbnail: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 3,
        isActive: true,
        tests: [{ testId: 'bank-mini-1', testTitle: 'Banking Basics Test 1', numQuestions: 10, durationMinutes: 45, questions: [] }]
    },
    {
        id: 'cuet-general-mini',
        title: 'CUET General Test Mini',
        category: 'CUET',
        description: 'Mock tests for Section III of the Common University Entrance Test.',
        thumbnail: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 4,
        isActive: true,
        tests: [{ testId: 'cuet-mini-1', testTitle: 'General Test Mock 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'mba-foundations-mock',
        title: 'MBA Entrance Foundations Mock',
        category: 'UPSC', // Using closest existing category logic if needed, but categories are just strings here
        description: 'Logical reasoning and Quant basics for CAT/XAT/NMAT.',
        thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 2,
        isActive: true,
        tests: [{ testId: 'mba-mini-1', testTitle: 'CAT Quant foundation 1', numQuestions: 10, durationMinutes: 40, questions: [] }]
    },
    {
        id: 'gate-eng-basics',
        title: 'GATE Engineering Basics',
        category: 'SSC', // Placeholder category
        description: 'Core concepts for GATE Engineering exam preparation.',
        thumbnail: 'https://images.unsplash.com/photo-1581094794329-c8112a4e5190?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 5,
        isActive: true,
        tests: [{ testId: 'gate-mini-1', testTitle: 'Engineering Math Mock 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'rrb-ntpc-mini',
        title: 'RRB NTPC Mini Mock',
        category: 'SSC',
        description: 'Fast-track mock tests for Railway recruitment exams.',
        thumbnail: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80',
        price: 0,
        isFree: true,
        totalTests: 6,
        isActive: true,
        tests: [{ testId: 'rrb-mini-1', testTitle: 'NTPC General Awareness 1', numQuestions: 10, durationMinutes: 30, questions: [] }]
    },

    // ─── NEW PAID SERIES (7) ───────────────────────────────────────────────────
    {
        id: 'upsc-gs-full-2026',
        title: 'UPSC GS Full Length Series',
        category: 'UPSC',
        description: 'Comprehensive test series covering the entire GS syllabus for UPSC Prelims 2026.',
        thumbnail: 'https://images.unsplash.com/photo-1491841573168-733ef01f70ad?w=800&q=80',
        price: 129,
        isFree: false,
        totalTests: 20,
        isActive: true,
        tests: [{ testId: 'upsc-full-1', testTitle: 'UPSC GS Mock 1: Polity & Economy', numQuestions: 10, durationMinutes: 120, questions: [] }]
    },
    {
        id: 'banking-po-clerk-full',
        title: 'Banking PO/Clerk Full Series',
        category: 'Banking',
        description: 'Targeted tests for IBPS and SBI PO/Clerk prelims and mains.',
        thumbnail: 'https://images.unsplash.com/photo-1550565118-3d143c4a3197?w=800&q=80',
        price: 89,
        isFree: false,
        totalTests: 15,
        isActive: true,
        tests: [{ testId: 'bank-full-1', testTitle: 'IBPS PO Prelims Mock 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'cuet-domain-test-series',
        title: 'CUET Domain Test Series',
        category: 'CUET',
        description: 'Subject-specific test series for CUET Domain subjects (Phy, Chem, Math, Bio).',
        thumbnail: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80',
        price: 79,
        isFree: false,
        totalTests: 12,
        isActive: true,
        tests: [{ testId: 'cuet-domain-1', testTitle: 'CUET Physics domain test 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'ssc-cgl-booster-pack',
        title: 'SSC CGL Tier 1 & 2 Booster',
        category: 'SSC',
        description: 'Advanced mock tests to boost your SSC CGL score with deep analysis.',
        thumbnail: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80',
        price: 119,
        isFree: false,
        totalTests: 25,
        isActive: true,
        tests: [{ testId: 'ssc-booster-1', testTitle: 'CGL Tier 1 Full length 1', numQuestions: 10, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'rrb-je-tech-mock-series',
        title: 'RRB JE Technical Mock',
        category: 'SSC',
        description: 'Mock tests focusing on technical subjects for Railway Junior Engineer exams.',
        thumbnail: 'https://images.unsplash.com/photo-1581094281212-d1993cc483fc?w=800&q=80',
        price: 69,
        isFree: false,
        totalTests: 10,
        isActive: true,
        tests: [{ testId: 'rrb-je-1', testTitle: 'RRB JE Civil/Mechanical test 1', numQuestions: 10, durationMinutes: 90, questions: [] }]
    },
    {
        id: 'nda-cds-defense-exam-pack',
        title: 'NDA/CDS Defense Exam Pack',
        category: 'SSC',
        description: 'Mock tests specifically designed for defense entry exams like NDA and CDS.',
        thumbnail: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
        price: 99,
        isFree: false,
        totalTests: 15,
        isActive: true,
        tests: [{ testId: 'nda-cds-1', testTitle: 'NDA Math & GAT Mock 1', numQuestions: 10, durationMinutes: 150, questions: [] }]
    },
    {
        id: 'state-psc-gs-series',
        title: 'State PSC General Studies',
        category: 'UPSC',
        description: 'Detailed GS mocks for various State Public Service Commission exams.',
        thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
        price: 59,
        isFree: false,
        totalTests: 12,
        isActive: true,
        tests: [{ testId: 'psc-gs-1', testTitle: 'PSC GS Mock 1: Indian Polity', numQuestions: 10, durationMinutes: 120, questions: [] }]
    }
];

async function seedExtraTests() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const allQs = await PracticeQuestion.find().lean();
        if (allQs.length === 0) {
            console.error('❌ No practice questions found. Run seed_all_tests.js first.');
            process.exit(1);
        }

        for (const pack of newSeries) {
            // Assign some questions to each test (using random sample)
            for (let t of pack.tests) {
                // Pick 10 random questions
                t.questions = allQs.sort(() => 0.5 - Math.random()).slice(0, 10).map(q => q._id);
                t.numQuestions = t.questions.length;
            }

            const exists = await MockTestPack.findOne({ id: pack.id });
            if (exists) {
                await MockTestPack.findOneAndUpdate({ id: pack.id }, pack, { new: true });
                console.log(`🔄 Updated: ${pack.title} (Price: ₹${pack.price})`);
            } else {
                await MockTestPack.create(pack);
                console.log(`✅ Created: ${pack.title} (Price: ₹${pack.price})`);
            }
        }

        console.log('\n🎉 Successfully added 13 mock test packs!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err.message);
        process.exit(1);
    }
}

seedExtraTests();
