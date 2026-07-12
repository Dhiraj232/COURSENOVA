const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const EXAMS = [
    { title: 'BITSAT Mock Test Series', id: 'bitsat-free' },
    { title: 'VITEEE Mock Test Series', id: 'viteee-free' },
    { title: 'LPUNEST Mock Test Series', id: 'lpunest-free' },
    { title: 'MET (Manipal) Mock Test Series', id: 'met-manipal-free' },
    { title: 'BHU Entrance Mock Test Series', id: 'bhu-entrance-free' },
    { title: 'AMU Entrance Mock Test Series', id: 'amu-entrance-free' }
];

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'English Proficiency', 'Logical Reasoning'];

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

        for (const exam of EXAMS) {
            console.log(`📦 Setting up: ${exam.title}...`);

            // Delete existing pack and questions to avoid double entries
            await MockTestPack.deleteMany({ id: exam.id });
            await PracticeQuestion.deleteMany({ category: exam.title, isMockTestOnly: true });

            const packTests = [];
            for (let s = 1; s <= 3; s++) {
                console.log(`   📝 Generating 70 questions for Set ${s}...`);
                const qIds = await generateMockQuestions(exam.title, s, 70);

                packTests.push({
                    testId: `${exam.id}-s${s}`,
                    testTitle: `Set ${s} Full Test`,
                    numQuestions: qIds.length,
                    durationMinutes: 150,
                    questions: qIds
                });
            }

            const pack = await MockTestPack.create({
                id: exam.id,
                title: exam.title,
                category: 'College Entrance',
                description: `Official free full-length mock test series for ${exam.title}. Contains 3 complete sets of exactly 70 mixed questions.`,
                thumbnail: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&q=80',
                price: 0,
                isFree: true,
                totalTests: 3,
                isActive: true,
                tests: packTests
            });

            console.log(`   ✅ Saved: ${pack.title} (Price: FREE, Tests: ${pack.tests.length})`);
        }

        console.log('\n🎉 ALL COLLEGE ENTRANCE MOCK TESTS SEEDED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

runSeeder();
