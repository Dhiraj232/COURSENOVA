require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const EXAMS = [
    { title: 'BITSAT Mock Test Series', id: 'bitsat-free' },
    { title: 'VITEEE Mock Test Series', id: 'viteee-free' },
    { title: 'LPUNEST Mock Test Series', id: 'lpunest-free' },
    { title: 'MET (Manipal) Mock Test Series', id: 'met-manipal-free' },
    { title: 'BHU Entrance Mock Test Series', id: 'bhu-entrance-free' }
];

async function generateQuestions(examTitle, setNum, count = 70) {
    const questionsToInsert = [];
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English Proficiency', 'Logical Reasoning'];
    
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
            difficulty: 'Hard', // University level exams are hard
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

        console.log("Cleaning up all tests in the Engineering & University Exams section...");
        
        // This will remove the JEE, NEET, etc., that were previously here
        await MockTestPack.deleteMany({ category: 'National Exam' });
        
        // Also clean up any old questions belonging to these specific new exams
        const titlesToClear = EXAMS.map(e => e.title);
        await PracticeQuestion.deleteMany({ category: { $in: titlesToClear }, isMockTestOnly: true });

        // Let's optionally clear PracticeQuestions mapped to other National exams to free DB space
        // For example: 'JEE Main Mock Test Series', 'NEET Mock Test Series'
        await PracticeQuestion.deleteMany({ 
            category: { 
                $in: ['JEE Main Mock Test Series', 'NEET Mock Test Series', 'CUET UG Mock Test Series', 'NDA Mock Test Series', 'CLAT Mock Test Series', 'CUET PG Mock Test Series'] 
            }, 
            isMockTestOnly: true 
        });

        console.log("Creating brand new Free University Entrance Exam Mock Tests...");
        
        for (const exam of EXAMS) {
            console.log(`Generating pack: ${exam.title}...`);

            const packInfo = {
                id: exam.id,
                title: exam.title,
                category: 'National Exam', // This binds to the 'nationalTestsSection' HTML correctly
                description: `Official free full-length mock test series for ${exam.title}. Contains 3 complete sets of exactly 70 mixed questions.`,
                thumbnail: 'https://placehold.co/400x200?text=University+Exam',
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
                    durationMinutes: 150, // Typical duration
                    questions: qIds
                });
            }
            
            await MockTestPack.create(packInfo);
            console.log(`✅ Saved ${exam.title} with 3 Sets of 70 questions.`);
        }

        console.log("\n🎉 University Exam Seeding Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding University Exams:", error);
        process.exit(1);
    }
}

seedData();
