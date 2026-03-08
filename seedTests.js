require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('./models/PracticeQuestion');
const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox-bookstore';

const subjectsData = {
    "Class 9": ["Mathematics", "Science", "English", "Social Science"],
    "Class 10": ["Mathematics", "Science", "English", "Social Science"],
    "Class 11": ["Physics", "Chemistry", "Mathematics", "Biology"],
    "Class 12": ["Physics", "Chemistry", "Mathematics", "Biology"],
    "JEE Main": ["Physics", "Chemistry", "Mathematics"],
    "NEET": ["Physics", "Chemistry", "Biology"],
    "SSC": ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
    "CUET": ["Section I (Languages)", "Section II (Domain)", "Section III (General)"],
    "UPSC": ["History", "Geography", "Polity", "Economy", "CSAT"],
    "Banking": ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"]
};

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for comprehensive seeding...');

        await PracticeQuestion.deleteMany({});
        await MockTestPack.deleteMany({});

        const allQuestions = [];

        for (const [category, subjects] of Object.entries(subjectsData)) {
            for (const subject of subjects) {
                // Seed 2 questions per subject
                allQuestions.push({
                    question: `What is a fundamental concept in ${category} ${subject}?`,
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correctAnswer: "Option A",
                    explanation: `This is a sample explanation for ${subject} in ${category}.`,
                    category,
                    subject,
                    topic: "General",
                    difficulty: "Medium"
                });

                allQuestions.push({
                    question: `What is the most common mistake students make in ${category} ${subject}?`,
                    options: ["Overthinking", "Calculation errors", "Misreading", "Time management"],
                    correctAnswer: "Misreading",
                    explanation: "Careful reading is key to success in competitive exams.",
                    category,
                    subject,
                    topic: "Strategy",
                    difficulty: "Easy"
                });
            }
        }

        const createdQuestions = await PracticeQuestion.insertMany(allQuestions);
        console.log(`Successfully created ${createdQuestions.length} practice questions covering all categories!`);

        // Create a few Mock Test Packs too
        const packs = [
            {
                id: 'jee-main-2025-full',
                title: 'JEE Main 2025: All Subject Mock',
                category: 'JEE Main',
                description: 'Full length test for JEE aspirants.',
                price: 199,
                isFree: false,
                totalTests: 1,
                tests: [{
                    testId: 'jee-full-1',
                    testTitle: 'JEE Mock Test #1',
                    numQuestions: 5,
                    durationMinutes: 180,
                    questions: createdQuestions.filter(q => q.category === 'JEE Main').slice(0, 5).map(q => q._id)
                }]
            },
            {
                id: 'class-10-board-booster',
                title: 'Class 10 Board Exam Booster',
                category: 'Class 10',
                description: 'Free practice set for Class 10 boards.',
                price: 0,
                isFree: true,
                totalTests: 1,
                tests: [{
                    testId: 'c10-math-1',
                    testTitle: 'Mathematics Board Practice',
                    numQuestions: 5,
                    durationMinutes: 60,
                    questions: createdQuestions.filter(q => q.category === 'Class 10' && q.subject === 'Mathematics').map(q => q._id)
                }]
            }
        ];

        await MockTestPack.insertMany(packs);
        console.log('Created comprehensive Mock Test Packs.');

        await mongoose.disconnect();
        console.log('Comprehensive Seeding completed.');
    } catch (err) {
        console.error('Seeding error:', err);
    }
};

seedData();
