const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

function generatePunjabPoliceQuestions(count = 80) {
    const list = [];
    const topics = ['Punjab GK', 'Numerical Ability', 'Mental Ability', 'English', 'Punjabi Language', 'Digital Literacy'];
    for (let i = 1; i <= count; i++) {
        const sub = topics[i % topics.length];
        list.push({
            question: `[Punjab Police Constable] ${sub} Q${i}: What is the correct answer for this ${sub} practice question?`,
            question_en: `[Punjab Police Constable] ${sub} Q${i}: What is the correct answer for this ${sub} practice question?`,
            question_hi: `[पंजाब पुलिस कांस्टेबल] ${sub} प्रश्न ${i}: इस ${sub} अभ्यास प्रश्न के लिए सही उत्तर क्या है?`,
            
            options: [`Answer A for Q${i}`, `Answer B for Q${i}`, `Answer C for Q${i}`, `Answer D for Q${i}`],
            options_en: [`Answer A for Q${i}`, `Answer B for Q${i}`, `Answer C for Q${i}`, `Answer D for Q${i}`],
            options_hi: [`उत्तर A - ${i}`, `उत्तर B - ${i}`, `उत्तर C - ${i}`, `उत्तर D - ${i}`],
            
            correctAnswer: `Answer A for Q${i}`,
            explanation: `Standard explanation for Punjab Police recruitment ${sub} topic.`,
            explanation_hi: `पंजाब पुलिस भर्ती ${sub} विषय के लिए मानक व्याख्या।`,
            
            category: 'Govt Exam',
            subject: 'Punjab Police Mix',
            difficulty: i % 2 === 0 ? 'Medium' : 'Easy',
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

        console.log('📦 Creating special Pack: Punjab Police Constable (₹1)...');
        
        const packTests = [];
        for (let setNum = 1; setNum <= 5; setNum++) {
            console.log(`   📝 Generating 80 questions for Set ${setNum}...`);
            const qs = generatePunjabPoliceQuestions(80);
            const savedQs = await PracticeQuestion.insertMany(qs);
            
            packTests.push({
                testId: `punjab-police-constable-set-${setNum}`,
                testTitle: `Practice Set ${setNum}`,
                numQuestions: savedQs.length,
                durationMinutes: 90,
                questions: savedQs.map(q => q._id)
            });
        }

        await MockTestPack.create({
            id: 'punjab-police-constable-special',
            title: 'Punjab POLICE CONSTABLE',
            category: 'Govt Exam',
            price: 1, // SPECIAL PRICE ₹1
            isFree: false,
            totalTests: 5,
            isActive: true,
            thumbnail: 'https://images.unsplash.com/photo-1594122230689-45899d9e6f69?w=800&q=80',
            tests: packTests
        });

        console.log('\n✨ SPECIAL SEEDING COMPLETE!');
        console.log('   - Exam: Punjab POLICE CONSTABLE');
        console.log('   - Price: ₹1');
        console.log('   - 5 Sets, 80 Questions Each');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
