require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const EXAMS = [
    { title: 'SSC GD Mock Test Series', id: 'ssc-gd-free' },
    { title: 'SSC MTS Mock Test Series', id: 'ssc-mts-free' },
    { title: 'Bihar Police Constable Mock Test Series', id: 'bihar-police-constable-free' },
    { title: 'Delhi Police Constable Mock Test Series', id: 'delhi-police-constable-free' },
    { title: 'UP Police Constable Mock Test Series', id: 'up-police-constable-free' },
    { title: 'Army GD Mock Test Series', id: 'army-gd-free' },
    { title: 'SSC CGL Mock Test Series', id: 'ssc-cgl-free' },
    { title: 'Railway Group D Mock Test Series', id: 'railway-group-d-free' },
    { title: 'Banking Reasoning Mock Test Series', id: 'banking-reasoning-free' }
];

async function generateQuestions(examTitle, setNum, count = 70) {
    const questionsToInsert = [];
    const subjects = ['General Knowledge', 'Mathematics', 'Reasoning', 'English/Hindi'];
    
    for (let i = 1; i <= count; i++) {
        // Mix topics randomly
        const mixSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const correctIdx = Math.floor(Math.random() * 4);
        const optionsEng = ["Option A", "Option B", "Option C", "Option D"];
        const optionsHi = ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"];

        questionsToInsert.push({
            question: `${examTitle} Set ${setNum} - ${mixSubject}: Which of the following is correct for Q${i}?`,
            question_en: `${examTitle} Set ${setNum} - ${mixSubject}: Which of the following is correct for Q${i}?`,
            question_hi: `${examTitle} सेट ${setNum} - ${mixSubject}: निम्नलिखित में से Q${i} के लिए क्या सही है?`,
            
            options: optionsEng,
            options_en: optionsEng,
            options_hi: optionsHi,
            
            correctAnswer: optionsEng[correctIdx],
            
            explanation: `Correct answer is ${optionsEng[correctIdx]}. Detailed explanation for Q${i}.`,
            explanation_hi: `सही उत्तर ${optionsHi[correctIdx]} है। प्रश्न ${i} का विस्तृत स्पष्टीकरण।`,
            
            category: examTitle,
            subject: 'Mixed', // Since all subjects are mixed in one test
            topic: 'Mock Test Section',
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

        console.log("Cleaning up old Govt Exam Mock Tests...");
        
        await MockTestPack.deleteMany({ category: 'Govt Exam' });
        
        // Let's delete all MockTest practice questions related to Govt Exams to avoid bloat
        // We use category: 'Govt Exam' generics or just clear the ones matching these specific titles
        const titlesToClear = EXAMS.map(e => e.title);
        await PracticeQuestion.deleteMany({ category: { $in: titlesToClear }, isMockTestOnly: true });

        console.log("Creating brand new Free Govt Exam Mock Tests...");
        
        for (const exam of EXAMS) {
            console.log(`Generating pack: ${exam.title}...`);

            const packInfo = {
                id: exam.id,
                title: exam.title,
                category: 'Govt Exam', // This maps natively to your Govt Exam section
                description: `Official free full-length mock test series for ${exam.title}. Contains 3 complete sets of 70+ mixed questions inside!`,
                thumbnail: 'https://placehold.co/400x200?text=Govt+Exam',
                price: 0,
                isFree: true,
                totalTests: 3,
                tests: [],
                isActive: true
            };

            // Create 3 Sets (Each Set contains 70+ Questions, mixed subjects)
            for (let setNum = 1; setNum <= 3; setNum++) {
                const testTitle = `Set ${setNum} Full Test`;
                const qIds = await generateQuestions(exam.title, setNum, 70);
                
                packInfo.tests.push({
                    testId: `${exam.id}-s${setNum}`,
                    testTitle: testTitle,
                    numQuestions: 70,
                    durationMinutes: 90, // 90 mins for full length
                    questions: qIds
                });
            }
            
            await MockTestPack.create(packInfo);
            console.log(`✅ Saved ${exam.title} with 3 Sets of 70 questions.`);
        }

        console.log("\n🎉 Govt Exam Seeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding Govt Exams:", error);
        process.exit(1);
    }
}

seedData();
