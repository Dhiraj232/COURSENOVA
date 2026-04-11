const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova-bookstore';

const demoQuestionsTemplate = (topic) => [
    {
        question: `What is the core concept of ${topic}?`,
        options: ["Core Principle A", "Core Principle B", "Secondary Option", "Unrelated Option"],
        correctIndex: 0
    },
    {
        question: `Which methodology is best suited for ${topic}?`,
        options: ["Linear Thinking", "Dynamic Analysis", "Top-Down Approach", "Static Setup"],
        correctIndex: 1
    },
    {
        question: `Why is ${topic} important?`,
        options: ["It is not important", "Fundamental for advanced topics", "Only for exams", "Just for theory"],
        correctIndex: 1
    },
    {
        question: `Identify a common challenge in ${topic}.`,
        options: ["Resource Management", "Time Complexity", "Over-engineering", "Syntax Errors"],
        correctIndex: 0
    },
    {
        question: `An advanced ${topic} scenario requires:`,
        options: ["Memorization", "Synthesis & Application", "Basic Recall", "Guessing"],
        correctIndex: 1
    },
    {
        question: `What is the first step when tackling ${topic}?`,
        options: ["Action", "Planning & Analysis", "Review", "Deployment"],
        correctIndex: 1
    },
    {
        question: `Which tool is often associated with ${topic}?`,
        options: ["Hammer", "Debuggers & Profilers", "Wrench", "Calculator"],
        correctIndex: 1
    },
    {
        question: `How do you measure success in ${topic}?`,
        options: ["By Lines of Code", "By Metrics & Outcomes", "By Guesswork", "By Complaints"],
        correctIndex: 1
    },
    {
        question: `A best practice in ${topic} is:`,
        options: ["Ignoring errors", "Continuous improvement & testing", "Doing it once and forgetting", "Delegating everything"],
        correctIndex: 1
    },
    {
        question: `What is the future trend of ${topic}?`,
        options: ["Diminishing relevance", "AI Integration & Automation", "Becoming manual", "Stagnation"],
        correctIndex: 1
    }
];

async function seedAllMissingQuestions() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Course Tests
        const courses = await Course.find({});
        let courseCount = 0;
        for (const course of courses) {
            if (!course.quizQuestions || course.quizQuestions.length === 0) {
                course.quizQuestions = demoQuestionsTemplate(course.title || 'this subject');
                try {
                    await course.save();
                    courseCount++;
                } catch (saveErr) {
                    console.error("Error saving course", course.title, ":", saveErr.message);
                }
            }
        }
        console.log(`Seeded questions for ${courseCount} courses.`);

        // Mock Tests (If any test inside a pack doesn't have questions)
        const mockPacks = await MockTestPack.find({});
        let packQuestionCount = 0;
        const fallbackQs = await PracticeQuestion.find({}).limit(10);
        let fallbackIds = fallbackQs.map(q => q._id);
        
        for (const pack of mockPacks) {
            let changed = false;
            pack.tests.forEach(t => {
                if (!t.questions || t.questions.length === 0) {
                    t.questions = fallbackIds;
                    t.numQuestions = fallbackIds.length;
                    changed = true;
                    packQuestionCount++;
                }
            });
            if (changed) {
                await pack.save();
            }
        }
        console.log(`Seeded missing questions for ${packQuestionCount} Mock Tests inside Packs.`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedAllMissingQuestions();
