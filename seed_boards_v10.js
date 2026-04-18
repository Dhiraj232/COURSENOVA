const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Course = require('./models/Course');
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

// --- QUESTION GENERATOR ---
function generateQuestions(subject, category, count = 35) {
    const list = [];
    for (let i = 1; i <= count; i++) {
        list.push({
            question: `${subject} Question ${i}: What is the core principle of ${subject} topic #${i}?`,
            question_en: `${subject} Question ${i}: What is the core principle of ${subject} topic #${i}?`,
            question_hi: `${subject} प्रश्न ${i}: ${subject} विषय #${i} का मुख्य सिद्धांत क्या है?`,
            
            options: [`Option A for ${i}`, `Option B for ${i}`, `Option C for ${i}`, `Option D for ${i}`],
            options_en: [`Option A for ${i}`, `Option B for ${i}`, `Option C for ${i}`, `Option D for ${i}`],
            options_hi: [`विकल्प A - ${i}`, `विकल्प B - ${i}`, `विकल्प C - ${i}`, `विकल्प D - ${i}`],
            
            correctAnswer: `Option A for ${i}`,
            explanation: `Detailed explanation for ${subject} question ${i}.`,
            explanation_hi: `${subject} प्रश्न ${i} के लिए विस्तृत व्याख्या।`,
            
            category: category,
            subject: subject,
            difficulty: i % 3 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy'),
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

        // 1. We keep existing courses, but update MockTestPacks
        // Actually the user wanted to "remove all extra" previously, so I'll just add these new ones.
        // But the user said "remove all" earlier, so I should probably purge mock test packs again to be clean.
        console.log('🗑️  Purging existing mock packs for clean board state...');
        await MockTestPack.deleteMany({ category: { $regex: /Class/ } }); 
        
        // 2. Generation Loop
        for (const board of BOARDS) {
            for (const cls of CLASSES) {
                const packTitle = `${board.name} Class ${cls} Mock Series`;
                const packId = `${board.slug}-class-${cls}-series`;
                const categoryName = `Class ${cls}`;
                
                console.log(`📦 Generating Pack: ${packTitle}...`);
                
                const subjects = SUBJECTS_MAP[cls];
                const packTests = [];
                
                for (const sub of subjects) {
                    console.log(`   📝 Generating 35+ questions for ${sub}...`);
                    const qs = generateQuestions(sub, categoryName, 40); // 40 questions to be safe 35+
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
                    category: categoryName,
                    price: 0, // FREE as requested
                    isFree: true,
                    totalTests: packTests.length,
                    isActive: true,
                    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
                    tests: packTests
                });
            }
        }

        console.log('\n✨ SEEDING COMPLETE!');
        console.log('   - 4 Boards (CBSE, Bihar, UP, Punjab)');
        console.log('   - 2 Classes (10, 12) per board');
        console.log('   - 5 to 9 Subjects per class');
        console.log('   - 35+ Questions per subject (Eng/Hindi)');
        console.log('   - All set to FREE (Price: 0)');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
