require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const EXAMS = [
    { title: 'JEE Main Mock Test Series', id: 'jee-main-free' },
    { title: 'NEET Mock Test Series', id: 'neet-free' },
    { title: 'CUET UG Mock Test Series', id: 'cuet-ug-free' },
    { title: 'NDA Mock Test Series', id: 'nda-free' },
    { title: 'CLAT Mock Test Series', id: 'clat-free' },
    { title: 'CUET PG Mock Test Series', id: 'cuet-pg-free' }
];

async function generateQuestions(examTitle, setNum, count = 70) {
    const questionsToInsert = [];
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'General Aptitude', 'Reasoning', 'English'];
    
    for (let i = 1; i <= count; i++) {
        // Mix topics randomly
        const mixSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const correctIdx = Math.floor(Math.random() * 4);
        const optionsEng = ["Option A", "Option B", "Option C", "Option D"];
        const optionsHi = ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"];

        questionsToInsert.push({
            question: `${examTitle} Set ${setNum} - ${mixSubject}: Which of the following is correct for question ${i}?`,
            question_en: `${examTitle} Set ${setNum} - ${mixSubject}: Which of the following is correct for question ${i}?`,
            question_hi: `${examTitle} सेट ${setNum} - ${mixSubject}: निम्नलिखित में से प्रश्न ${i} के लिए क्या सही है?`,
            
            options: optionsEng,
            options_en: optionsEng,
            options_hi: optionsHi,
            
            correctAnswer: optionsEng[correctIdx],
            
            explanation: `Correct answer is ${optionsEng[correctIdx]}. Detailed explanation for Q${i}.`,
            explanation_hi: `सही उत्तर ${optionsHi[correctIdx]} है। प्रश्न ${i} का विस्तृत स्पष्टीकरण।`,
            
            category: examTitle,
            subject: 'Mixed', // Since all subjects are mixed in one test
            topic: 'Mock Test Section',
            difficulty: 'Hard', // Usually National level exams are hard
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

        console.log("Cleaning up old National Exam Mock Tests...");
        
        await MockTestPack.deleteMany({ category: 'National Exam' });
        
        const titlesToClear = EXAMS.map(e => e.title);
        await PracticeQuestion.deleteMany({ category: { $in: titlesToClear }, isMockTestOnly: true });

        console.log("Creating brand new Free National Entrance Exam Mock Tests...");
        
        for (const exam of EXAMS) {
            console.log(`Generating pack: ${exam.title}...`);

            const packInfo = {
                id: exam.id,
                title: exam.title,
                category: 'National Exam', // Maps natively to the National Exam section in the UI
                description: `Official free full-length mock test series for ${exam.title}. Contains 3 complete sets of 70+ mixed questions!`,
                thumbnail: 'https://placehold.co/400x200?text=National+Exam',
                price: 0,
                isFree: true,
                totalTests: 3,
                tests: [],
                isActive: true
            };

            // Create 3 Sets (Each Set contains 70 Questions, mixed subjects)
            for (let setNum = 1; setNum <= 3; setNum++) {
                const testTitle = `Set ${setNum} Full Test`;
                const qIds = await generateQuestions(exam.title, setNum, 70);
                
                packInfo.tests.push({
                    testId: `${exam.id}-s${setNum}`,
                    testTitle: testTitle,
                    numQuestions: 70,
                    durationMinutes: 180, // Usually entrance exams are 3 hours
                    questions: qIds
                });
            }
            
            await MockTestPack.create(packInfo);
            console.log(`✅ Saved ${exam.title} with 3 Sets of 70 questions.`);
        }

        console.log("\n🎉 National Exam Seeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding National Exams:", error);
        process.exit(1);
    }
}

seedData();
