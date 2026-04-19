require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

// Add await inside seedData instead of connecting blindly here.
const BOARDS = [
    { idPrefix: 'cbse', name: 'CBSE' },
    { idPrefix: 'bihar-board', name: 'Bihar Board' },
    { idPrefix: 'up-board', name: 'UP Board' },
    { idPrefix: 'punjab-board', name: 'Punjab Board' }
];

const DIVISIONS = [
    {
        idSuffix: 'class-10-free',
        titleSuffix: 'Class 10 Free Mock Tests',
        subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer Application']
    },
    {
        idSuffix: 'class-12-science-free',
        titleSuffix: 'Class 12 (Science) Free Mock Tests',
        subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English']
    },
    {
        idSuffix: 'class-12-arts-free',
        titleSuffix: 'Class 12 (Arts) Free Mock Tests',
        subjects: ['History', 'Geography', 'Political Science', 'Economics', 'English']
    },
    {
        idSuffix: 'class-12-commerce-free',
        titleSuffix: 'Class 12 (Commerce) Free Mock Tests',
        subjects: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'English']
    }
];

// Helper to generate dummy questions
async function generateQuestions(subject, categoryTitle, count = 35) {
    const questionsToInsert = [];
    for (let i = 1; i <= count; i++) {
        const correctIdx = Math.floor(Math.random() * 4);
        const optionsEng = ["Option A", "Option B", "Option C", "Option D"];
        const optionsHi = ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"];

        questionsToInsert.push({
            question: `${subject} - Which of the following is correct for Q${i}?`,
            question_en: `${subject} - Which of the following is correct for Q${i}?`,
            question_hi: `${subject} - निम्नलिखित में से Q${i} के लिए क्या सही है?`,
            
            options: optionsEng,
            options_en: optionsEng,
            options_hi: optionsHi,
            
            correctAnswer: optionsEng[correctIdx],
            
            explanation: `Correct answer is ${optionsEng[correctIdx]}. Detailed explanation for ${subject} Q${i}.`,
            explanation_hi: `सही उत्तर ${optionsHi[correctIdx]} है। ${subject} प्रश्न ${i} का विस्तृत स्पष्टीकरण।`,
            
            category: categoryTitle,
            subject: subject,
            topic: 'Chapter ' + (Math.floor(Math.random() * 10) + 1),
            difficulty: 'Medium',
            isMockTestOnly: true
        });
    }
    const inserted = await PracticeQuestion.insertMany(questionsToInsert);
    return inserted.map(q => q._id);
}

async function seedData() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova');
        console.log("MongoDB Connected!");

        console.log("Cleaning up old State Board Mock Tests...");
        // Define IDs to delete
        const targetIds = [];
        for (const board of BOARDS) {
            for (const div of DIVISIONS) {
                targetIds.push(`${board.idPrefix}-${div.idSuffix}`);
            }
        }
        
        // Delete all old packs in target IDs and also State Board category generically
        await MockTestPack.deleteMany({
            $or: [
                { id: { $in: targetIds } },
                { category: 'State Board' }
            ]
        });
        
        // Let's delete all MockTest practice questions related to these to avoid bloat (optional, but good for cleanliness)
        await PracticeQuestion.deleteMany({ category: { $regex: 'Class 1|State Board|CBSE|Bihar|UP Board|Punjab', $options: 'i' }, isMockTestOnly: true });

        console.log("Creating new State Board Free Mock Tests...");
        
        for (const board of BOARDS) {
            for (const div of DIVISIONS) {
                const packId = `${board.idPrefix}-${div.idSuffix}`;
                const packTitle = `${board.name} ${div.titleSuffix}`;
                console.log(`Generating pack: ${packTitle}...`);

                const packInfo = {
                    id: packId,
                    title: packTitle,
                    category: 'State Board', // so it maps to the correct filter and section
                    description: `Official free mock test series for ${packTitle} containing complete sets with exact exam pattern. Choose your language inside!`,
                    thumbnail: 'https://placehold.co/400x200?text=State+Board',
                    price: 0,
                    isFree: true,
                    totalTests: 0, // will calculate
                    tests: [],
                    isActive: true
                };

                // Create 3 Sets
                let testCounter = 0;
                for (let setNum = 1; setNum <= 3; setNum++) {
                    for (const subject of div.subjects) {
                        const testTitle = `Set ${setNum} - ${subject}`;
                        const qIds = await generateQuestions(subject, packTitle, 35);
                        
                        packInfo.tests.push({
                            testId: `${packId}-s${setNum}-${subject.toLowerCase().replace(/ /g, '-')}`,
                            testTitle: testTitle,
                            numQuestions: 35,
                            durationMinutes: 45, // 45 mins per subject
                            questions: qIds
                        });
                        testCounter++;
                    }
                }
                
                packInfo.totalTests = testCounter;
                
                await MockTestPack.create(packInfo);
                console.log(`✅ Saved ${packTitle} with ${testCounter} tests.`);
            }
        }

        console.log("\n🎉 State Board Seeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding state boards:", error);
        process.exit(1);
    }
}

seedData();
