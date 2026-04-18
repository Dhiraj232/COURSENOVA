const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

// --- BOARD CONFIG ---
const BOARDS = [
    { name: 'CBSE', slug: 'cbse' },
    { name: 'Bihar Board', slug: 'bseb' },
    { name: 'UP Board', slug: 'upmsp' },
    { name: 'Punjab Board', slug: 'pseb' }
];

const CLASSES = [10, 12];

const SUBJECTS_MAP = {
    10: ['Science', 'Mathematics', 'Social Science', 'Hindi', 'English'],
    12: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Economics', 'Business Studies', 'Accountancy', 'History', 'Geography']
};

function generateBoardQuestions(boardName, cls, subject, count = 40) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({
            question: `[${boardName} Class ${cls}] ${subject} Q${i}: What is the correct definition for this ${subject} concept?`,
            question_en: `[${boardName} Class ${cls}] ${subject} Q${i}: What is the correct definition for this ${subject} concept?`,
            question_hi: `[${boardName} Class ${cls}] ${subject} अभ्यास प्रश्न ${i}: इस ${subject} अवधारणा के लिए सही परिभाषा क्या है?`,
            
            options: [`Option A for ${i}`, `Option B for ${i}`, `Option C for ${i}`, `Option D for ${i}`],
            options_en: [`Option A for ${i}`, `Option B for ${i}`, `Option C for ${i}`, `Option D for ${i}`],
            options_hi: [`विकल्प A - ${i}`, `विकल्प B - ${i}`, `विकल्प C - ${i}`, `विकल्प D - ${i}`],
            
            correctAnswer: `Option A for ${i}`,
            explanation: `Explanation for ${boardName} Class ${cls} ${subject} question.`,
            explanation_hi: `${boardName} कक्षा ${cls} ${subject} प्रश्न के लिए व्याख्या।`,
            
            category: 'State Board',
            subject: subject,
            difficulty: i % 3 === 0 ? 'Hard' : 'Medium',
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

        for (const board of BOARDS) {
            for (const cls of CLASSES) {
                const packTitle = `${board.name} Class ${cls} Mock Series`;
                const packId = `${board.slug}-class-${cls}-paid`;
                const randomPrice = Math.floor(Math.random() * (129 - 59 + 1)) + 59;
                
                console.log(`📦 Generating Paid Pack: ${packTitle} (₹${randomPrice})...`);
                
                const subjects = SUBJECTS_MAP[cls];
                const packTests = [];
                
                for (const sub of subjects) {
                    console.log(`   📝 Generating questions for ${board.name} ${cls} ${sub}...`);
                    const qs = generateBoardQuestions(board.name, cls, sub, 40);
                    const savedQs = await PracticeQuestion.insertMany(qs);
                    
                    packTests.push({
                        testId: `${packId}-${sub.toLowerCase().replace(/\s+/g, '-')}`,
                        testTitle: sub,
                        numQuestions: savedQs.length,
                        durationMinutes: 60,
                        questions: savedQs.map(q => q._id)
                    });
                }
                
                await MockTestPack.create({
                    id: packId,
                    title: packTitle,
                    category: 'State Board',
                    price: randomPrice,
                    isFree: false,
                    totalTests: packTests.length,
                    isActive: true,
                    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
                    tests: packTests
                });
            }
        }

        console.log('\n✨ BOARD SEEDING COMPLETE!');
        console.log('   - 8 Paid Board Packs Added');
        console.log('   - Category: State Board');
        console.log('   - Pricing: ₹59 - ₹129');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
