const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const PREMIUM_EXAMS = [
    {
        id: 'ssc-gd-premium',
        title: 'SSC GD Mock Test Series',
        category: 'Govt Exam',
        price: 69,
        isFree: false,
        totalTests: 5,
        numQuestionsPerTest: 80,
        durationMinutes: 60,
        totalMarks: 160,
        thumbnail: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&q=80'
    },
    {
        id: 'ssc-mts-premium',
        title: 'SSC MTS Mock Test Series',
        category: 'Govt Exam',
        price: 59,
        isFree: false,
        totalTests: 4,
        numQuestionsPerTest: 90,
        durationMinutes: 90,
        totalMarks: 270,
        thumbnail: 'https://images.unsplash.com/photo-1454165833772-d996d49510d1?w=800&q=80'
    },
    {
        id: 'bihar-police-premium',
        title: 'Bihar Police Constable Mock Test Series',
        category: 'Govt Exam',
        price: 59,
        isFree: false,
        totalTests: 3,
        numQuestionsPerTest: 100,
        durationMinutes: 120,
        totalMarks: 100,
        thumbnail: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80'
    },
    {
        id: 'army-gd-premium',
        title: 'Army GD Mock Test Series',
        category: 'Govt Exam',
        price: 69,
        isFree: false,
        totalTests: 5,
        numQuestionsPerTest: 50,
        durationMinutes: 60,
        totalMarks: 100,
        thumbnail: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80'
    },
    {
        id: 'railway-group-d-premium',
        title: 'Railway Group D Mock Test Series',
        category: 'Govt Exam',
        price: 69,
        isFree: false,
        totalTests: 5,
        numQuestionsPerTest: 100,
        durationMinutes: 90,
        totalMarks: 100,
        thumbnail: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80'
    },
    {
        id: 'ssc-cgl-free-series',
        title: 'SSC CGL Free Mock Test Series',
        category: 'Govt Exam',
        price: 0,
        isFree: true,
        totalTests: 3,
        numQuestionsPerTest: 70,
        durationMinutes: 90,
        totalMarks: 140,
        thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024adb0?w=800&q=80'
    }
];

const SUBJECTS = ['General Knowledge', 'Mathematics', 'Reasoning', 'English/Hindi'];

async function generateMockQuestions(examTitle, setNum, count) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        const sub = SUBJECTS[i % SUBJECTS.length];
        const correctIdx = Math.floor(Math.random() * 4);
        const optsEn = [`Option A for Q${i}`, `Option B for Q${i}`, `Option C for Q${i}`, `Option D for Q${i}`];
        const optsHi = [`विकल्प A - प्रश्न ${i}`, `विकल्प B - प्रश्न ${i}`, `विकल्प C - प्रश्न ${i}`, `विकल्प D - प्रश्न ${i}`];

        list.push({
            question: `[${sub}] ${examTitle} Set ${setNum} Q${i}: Which is the correct answer for this standard exam question?`,
            question_en: `[${sub}] ${examTitle} Set ${setNum} Q${i}: Which is the correct answer for this standard exam question?`,
            question_hi: `[${sub}] ${examTitle} सेट ${setNum} प्रश्न ${i}: इस मानक परीक्षा प्रश्न का सही उत्तर क्या है?`,
            options: optsEn,
            options_en: optsEn,
            options_hi: optsHi,
            correctAnswer: optsEn[correctIdx],
            explanation: `Standard detailed solution for standard question ${i}.`,
            explanation_hi: `प्रश्न ${i} का विस्तृत समाधान।`,
            category: examTitle,
            subject: 'Mixed',
            difficulty: i % 3 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy'),
            isMockTestOnly: true
        });
    }
    const saved = await PracticeQuestion.insertMany(list);
    return saved.map(q => q._id);
}

async function runSeeder() {
    try {
        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully!');

        for (const exam of PREMIUM_EXAMS) {
            console.log(`📦 Setting up: ${exam.title}...`);

            // Delete existing pack and questions to avoid double entries
            await MockTestPack.deleteMany({ id: exam.id });
            await PracticeQuestion.deleteMany({ category: exam.title, isMockTestOnly: true });

            const packTests = [];
            for (let s = 1; s <= exam.totalTests; s++) {
                console.log(`   📝 Generating ${exam.numQuestionsPerTest} questions for Set ${s}...`);
                const qIds = await generateMockQuestions(exam.title, s, exam.numQuestionsPerTest);

                packTests.push({
                    testId: `${exam.id}-set-${s}`,
                    testTitle: `Set ${s} Full Test`,
                    numQuestions: qIds.length,
                    durationMinutes: exam.durationMinutes,
                    questions: qIds
                });
            }

            const pack = await MockTestPack.create({
                id: exam.id,
                title: exam.title,
                category: exam.category,
                description: `${exam.title} - Full Syllabus Mock Exam practice sets aligned to standard guidelines.`,
                thumbnail: exam.thumbnail,
                price: exam.price,
                isFree: exam.isFree,
                totalTests: exam.totalTests,
                totalMarks: exam.totalMarks,
                durationMinutes: exam.durationMinutes,
                isActive: true,
                tests: packTests
            });

            console.log(`   ✅ Saved: ${pack.title} (Price: ₹${pack.price}, Tests: ${pack.tests.length})`);
        }

        console.log('\n🎉 ALL GOVERNMENT PREMIUM MOCK TESTS RESTORED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

runSeeder();
