const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const EXAMS = [
    { name: 'AI Fundamentals', id: 'ai-fundamentals' },
    { name: 'Python Programming', id: 'python-programming' },
    { name: 'Data Science & AI – Mock Test', id: 'ds-ai-mock' }
];

function generateTechQuestions(examName, count = 40) {
    const list = [];
    const subjects = ['AI', 'Python', 'Data Science', 'Logic'];
    for (let i = 1; i <= count; i++) {
        const sub = subjects[i % subjects.length];
        list.push({
            question: `[${examName}] Tech Quiz Q${i}: What is the core concept of ${sub} discussed in this module?`,
            question_en: `[${examName}] Tech Quiz Q${i}: What is the core concept of ${sub} discussed in this module?`,
            question_hi: `[${examName}] तकनीकी क्विज़ प्रश्न ${i}: इस मॉड्यूल में चर्चा की गई ${sub} की मुख्य अवधारणा क्या है?`,
            
            options: [`Concept A for Q${i}`, `Concept B for Q${i}`, `Concept C for Q${i}`, `Concept D for Q${i}`],
            options_en: [`Concept A for Q${i}`, `Concept B for Q${i}`, `Concept C for Q${i}`, `Concept D for Q${i}`],
            options_hi: [`अवधारणा A - ${i}`, `अवधारणा B - ${i}`, `अवधारणा C - ${i}`, `अवधारणा D - ${i}`],
            
            correctAnswer: `Concept A for Q${i}`,
            explanation: `Explanation for ${examName} technical question #${i}.`,
            explanation_hi: `${examName} तकनीकी प्रश्न #${i} के लिए व्याख्या।`,
            
            category: 'Tech Free',
            subject: 'Technology',
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

        for (const exam of EXAMS) {
            console.log(`📦 Creating Tech Pack: ${exam.name}...`);
            
            const qs = generateTechQuestions(exam.name, 40);
            const savedQs = await PracticeQuestion.insertMany(qs);
            
            await MockTestPack.create({
                id: `${exam.id}-free`,
                title: exam.name,
                category: 'Tech Free',
                price: 0,
                isFree: true,
                totalTests: 1,
                isActive: true,
                thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
                tests: [{
                    testId: `${exam.id}-set-1`,
                    testTitle: 'Full Assessment',
                    numQuestions: savedQs.length,
                    durationMinutes: 45,
                    questions: savedQs.map(q => q._id)
                }]
            });
        }

        console.log('\n✨ TECH FREE SEEDING COMPLETE!');
        console.log('   - 3 Free Tech Mock Tests Added');
        console.log('   - Placement: TOP of page');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
