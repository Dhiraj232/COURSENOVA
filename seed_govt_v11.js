const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const EXAMS = [
    { name: 'SSC GD Constable', id: 'ssc-gd' },
    { name: 'Railway Group D', id: 'railway-group-d' },
    { name: 'Army GD', id: 'army-gd' },
    { name: 'Home Guard', id: 'home-guard' },
    { name: 'SSC CHSL', id: 'ssc-chsl' },
    { name: 'Delhi Police Constable', id: 'delhi-police' },
    { name: 'SSC CGL', id: 'ssc-cgl' },
    { name: 'Banking PO', id: 'banking-po' },
    { name: 'Banking Clerk', id: 'banking-clerk' },
    { name: 'NDA', id: 'nda' },
    { name: 'Bihar Police Constable', id: 'bihar-police' },
    { name: 'UP Police Constable', id: 'up-police' }
];

const SUBJECT_MIX = ['General Knowledge', 'Mathematics', 'Reasoning', 'English/Hindi'];

function generateGovtQuestions(examName, count = 80) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        const sub = SUBJECT_MIX[i % SUBJECT_MIX.length];
        list.push({
            question: `[${sub}] ${examName} Practice Q${i}: What is the correct analysis for this ${sub} problem?`,
            question_en: `[${sub}] ${examName} Practice Q${i}: What is the correct analysis for this ${sub} problem?`,
            question_hi: `[${sub}] ${examName} अभ्यास प्रश्न ${i}: इस ${sub} समस्या के लिए सही विश्लेषण क्या है?`,
            
            options: [`Answer A for ${i}`, `Answer B for ${i}`, `Answer C for ${i}`, `Answer D for ${i}`],
            options_en: [`Answer A for ${i}`, `Answer B for ${i}`, `Answer C for ${i}`, `Answer D for ${i}`],
            options_hi: [`उत्तर A - ${i}`, `उत्तर B - ${i}`, `उत्तर C - ${i}`, `उत्तर D - ${i}`],
            
            correctAnswer: `Answer A for ${i}`,
            explanation: `Standard explanation for ${examName} - ${sub} type question.`,
            explanation_hi: `${examName} के लिए मानक व्याख्या - ${sub} प्रकार का प्रश्न।`,
            
            category: 'Govt Exam',
            subject: 'Mix',
            difficulty: i % 4 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy'),
            isMockTestOnly: true
        });
    }
    return list;
}

async function seed() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        for (const exam of EXAMS) {
            console.log(`📦 Creating Pack for ${exam.name}...`);
            
            const packTests = [];
            for (let setNum = 1; setNum <= 5; setNum++) {
                console.log(`   📝 Generating 80 questions for Set ${setNum}...`);
                const qs = generateGovtQuestions(exam.name, 80);
                const savedQs = await PracticeQuestion.insertMany(qs);
                
                packTests.push({
                    testId: `${exam.id}-set-${setNum}`,
                    testTitle: `Practice Set ${setNum}`,
                    numQuestions: savedQs.length,
                    durationMinutes: 90,
                    questions: savedQs.map(q => q._id)
                });
            }

            await MockTestPack.create({
                id: `${exam.id}-series`,
                title: `${exam.name} Full Series`,
                category: 'Govt Exam',
                price: 0,
                isFree: true,
                totalTests: 5,
                isActive: true,
                thumbnail: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80',
                tests: packTests
            });
        }

        console.log('\n✨ GOVT SEEDING COMPLETE!');
        console.log('   - 12 Govt Exams Added');
        console.log('   - 5 Sets per Exam');
        console.log('   - 80 Questions per Set (Mixed Subjects)');
        console.log('   - All FREE');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
