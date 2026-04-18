const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const EXAMS = [
    { name: 'JEE Main', id: 'jee-main' },
    { name: 'NEET', id: 'neet' },
    { name: 'CUET UG', id: 'cuet-ug' },
    { name: 'BITSAT', id: 'bitsat' },
    { name: 'LPUNEST', id: 'lpunest' },
    { name: 'SRMJEEE', id: 'srmjeee' },
    { name: 'VITEEE', id: 'viteee' },
    { name: 'MET (Manipal)', id: 'met-manipal' },
    { name: 'CUET PG', id: 'cuet-pg' },
    { name: 'IPU CET', id: 'ipu-cet' },
    { name: 'BHU Entrance', id: 'bhu-entrance' }
];

const SUBJECTS = ['Physics', 'Chemistry', 'Biology/Mathematics', 'Aptitude/Logical Reasoning'];

function generateNationalQuestions(examName, count = 80) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        const sub = SUBJECTS[i % SUBJECTS.length];
        list.push({
            question: `[${sub}] ${examName} Entrance Practice Q${i}: What is the correct solution for this ${sub} concept?`,
            question_en: `[${sub}] ${examName} Entrance Practice Q${i}: What is the correct solution for this ${sub} concept?`,
            question_hi: `[${sub}] ${examName} प्रवेश परीक्षा अभ्यास प्रश्न ${i}: इस ${sub} अवधारणा के लिए सही समाधान क्या है?`,
            
            options: [`Solution A for ${i}`, `Solution B for ${i}`, `Solution C for ${i}`, `Solution D for ${i}`],
            options_en: [`Solution A for ${i}`, `Solution B for ${i}`, `Solution C for ${i}`, `Solution D for ${i}`],
            options_hi: [`समाधान A - ${i}`, `समाधान B - ${i}`, `समाधान C - ${i}`, `समाधान D - ${i}`],
            
            correctAnswer: `Solution A for ${i}`,
            explanation: `Conceptual explanation for ${examName} entrance level ${sub} question.`,
            explanation_hi: `${examName} प्रवेश स्तर के ${sub} प्रश्न के लिए वैचारिक व्याख्या।`,
            
            category: 'National Exam',
            subject: 'Entrance Mix',
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
            console.log(`📦 Creating National Pack for ${exam.name}...`);
            
            const packTests = [];
            for (let setNum = 1; setNum <= 5; setNum++) {
                console.log(`   📝 Generating 80 questions for ${exam.name} Set ${setNum}...`);
                const qs = generateNationalQuestions(exam.name, 80);
                const savedQs = await PracticeQuestion.insertMany(qs);
                
                packTests.push({
                    testId: `${exam.id}-set-${setNum}`,
                    testTitle: `Exam Set ${setNum}`,
                    numQuestions: savedQs.length,
                    durationMinutes: 120, // 2 hours for entrance exams
                    questions: savedQs.map(q => q._id)
                });
            }

            await MockTestPack.create({
                id: `${exam.id}-national-series`,
                title: `${exam.name} Entrance Mock Series`,
                category: 'National Exam',
                price: 0,
                isFree: true,
                totalTests: 5,
                isActive: true,
                thumbnail: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&q=80',
                tests: packTests
            });
        }

        console.log('\n✨ NATIONAL SEEDING COMPLETE!');
        console.log('   - 11 National Level Entrance Exams Added');
        console.log('   - 5 Sets per Exam');
        console.log('   - 80 Questions per Set');
        console.log('   - All FREE');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
