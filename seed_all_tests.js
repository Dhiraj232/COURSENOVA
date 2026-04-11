const mongoose = require('mongoose');
require('dotenv').config();
const PracticeQuestion = require('./models/PracticeQuestion');
const MockTestPack = require('./models/MockTestPack');

// Helper to create 5 sample questions per topic
const generateQuestions = (category, subject) => {
    return [
        {
            category, subject,
            question: `What is the fundamental concept of ${subject} in ${category}?`,
            options: ["Option A - Core Principle", "Option B - Secondary Concept", "Option C - Incorrect Idea", "Option D - Basic Fact"],
            correctAnswer: "Option A - Core Principle",
            explanation: `This is a sample explanation for ${subject}. Understanding the core principle is essential for this topic.`,
            difficulty: 'Easy'
        },
        {
            category, subject,
            question: `Which analysis method is widely used in ${subject} (${category})?`,
            options: ["Qualitative", "Quantitative", "Both A and B", "None of above"],
            correctAnswer: "Both A and B",
            explanation: `Both qualitative and quantitative methods are fundamental in ${subject}.`,
            difficulty: 'Medium'
        },
        {
            category, subject,
            question: `Why is ${subject} critical for ${category} preparation?`,
            options: ["It forms the base syllabus", "It has highest weightage", "It tests analytical skills", "All of the above"],
            correctAnswer: "All of the above",
            explanation: `For exams like ${category}, every aspect of ${subject} is rigorously tested.`,
            difficulty: 'Medium'
        },
        {
            category, subject,
            question: `Identify the correct sequence for solving problems in ${subject}.`,
            options: ["Read, Execute, Plan", "Plan, Execute, Read", "Read, Plan, Execute", "Execute, Read, Plan"],
            correctAnswer: "Read, Plan, Execute",
            explanation: `Always read the problem, plan your approach, and then execute your solution.`,
            difficulty: 'Easy'
        },
        {
            category, subject,
            question: `Advanced application of ${subject} in ${category} involves:`,
            options: ["Memorization", "Critical Thinking and Synthesis", "Speed", "Basic Recall"],
            correctAnswer: "Critical Thinking and Synthesis",
            explanation: `Advanced levels require you to synthesize multiple concepts simultaneously.`,
            difficulty: 'Hard'
        }
    ];
};

const subjectsMap = {
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

// Mock Test Packs
const testPacks = [
    {
        id: "jee-main-2026",
        title: "JEE Main 2026 Complete Test Series",
        category: "JEE Main",
        thumbnail: "https://images.unsplash.com/photo-1635359734139-388147d6e4be?w=800&q=80",
        originalPrice: 2000,
        price: 999,
        isFree: false,
        totalTests: 15,
        isActive: true,
        tests: [
            {
                testId: "jee-full-1",
                testTitle: "JEE Main Full Length Test 1",
                numQuestions: 10,
                durationMinutes: 180,
                questions: [] 
            }
        ]
    },
    {
        id: "neet-2026",
        title: "NEET 2026 Target Series",
        category: "NEET",
        thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
        originalPrice: 1500,
        price: 799,
        isFree: false,
        totalTests: 10,
        isActive: true,
        tests: [
            {
                testId: "neet-full-1",
                testTitle: "NEET Physics + Chem + Bio Test 1",
                numQuestions: 10,
                durationMinutes: 200,
                questions: []
            }
        ]
    },
    {
        id: "ssc-cgl-free",
        title: "SSC CGL Tier 1 Mini Mock",
        category: "SSC",
        thumbnail: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&q=80",
        originalPrice: 0,
        price: 0,
        isFree: true,
        totalTests: 5,
        isActive: true,
        tests: [
            {
                testId: "ssc-mini-1",
                testTitle: "SSC Mini Mock Test 1",
                numQuestions: 10,
                durationMinutes: 60,
                questions: []
            }
        ]
    }
];

async function seedAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova-bookstore');
        
        // 1. Clear practice questions to avoid duplicates
        await PracticeQuestion.deleteMany({});
        await MockTestPack.deleteMany({});
        console.log("Cleared old questions and packs.");

        // 2. Insert Practice Questions
        let allQuestions = [];
        for (const [cat, subjects] of Object.entries(subjectsMap)) {
            for (const sub of subjects) {
                allQuestions.push(...generateQuestions(cat, sub));
            }
        }
        const savedQs = await PracticeQuestion.insertMany(allQuestions);
        console.log(`Inserted ${savedQs.length} practice questions.`);

        // 3. Setup Mock Packs with some actual questions
        for (let pack of testPacks) {
            // Assign some questions matching the category of the pack
            let packQuestions = savedQs.filter(q => q.category === pack.category);
            pack.tests[0].questions = packQuestions.slice(0, 10).map(q => q._id);
            pack.tests[0].numQuestions = pack.tests[0].questions.length;
        }
        await MockTestPack.insertMany(testPacks);
        console.log("Inserted 3 Mock Test Packs.");

        console.log("✅ Seeding completed perfectly!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seedAll();
