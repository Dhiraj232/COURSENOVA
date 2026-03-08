const mongoose = require('mongoose');
const Question = require('./models/Question');
const CodingProblem = require('./models/CodingProblem');
const PracticeLeaderboard = require('./models/Leaderboard');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox-bookstore';

const questions = [
    {
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correctAnswer: "O(log n)",
        category: "DSA",
        difficulty: "easy"
    },
    {
        question: "Which data structure uses LIFO (Last-In-First-Out)?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        correctAnswer: "Stack",
        category: "DSA",
        difficulty: "easy"
    },
    {
        question: "In Web Development, what does CSS stand for?",
        options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"],
        correctAnswer: "Cascading Style Sheets",
        category: "Web Dev",
        difficulty: "easy"
    },
    {
        question: "What is the purpose of the 'git clone' command?",
        options: ["To delete a repository", "To create a copy of a repository", "To merge branches", "To update local code"],
        correctAnswer: "To create a copy of a repository",
        category: "Programming",
        difficulty: "easy"
    },
    {
        question: "Which keyword is used to define a function in JavaScript?",
        options: ["func", "def", "function", "lambda"],
        correctAnswer: "function",
        category: "Programming",
        difficulty: "easy"
    }
];

const codingProblems = [
    {
        title: "Check Armstrong Number",
        description: "Write a function to check if a number is an Armstrong number of 3 digits.",
        exampleInput: "153",
        exampleOutput: "true (1^3 + 5^3 + 3^3 = 153)",
        difficulty: "easy"
    },
    {
        title: "Reverse a String",
        description: "Given a string, return its reverse.",
        exampleInput: "hello",
        exampleOutput: "olleh",
        difficulty: "easy"
    }
];

const dummyLeaderboard = [
    { username: 'Rahul', score: 95, date: new Date().setHours(0, 0, 0, 0), userId: new mongoose.Types.ObjectId() },
    { username: 'Dhiraj', score: 88, date: new Date().setHours(0, 0, 0, 0), userId: new mongoose.Types.ObjectId() },
    { username: 'Aman', score: 82, date: new Date().setHours(0, 0, 0, 0), userId: new mongoose.Types.ObjectId() }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding practice data...');

        await Question.deleteMany({});
        await Question.insertMany(questions);
        console.log('MCQ questions seeded.');

        await CodingProblem.deleteMany({});
        await CodingProblem.insertMany(codingProblems);
        console.log('Coding problems seeded.');

        await PracticeLeaderboard.deleteMany({});
        await PracticeLeaderboard.insertMany(dummyLeaderboard);
        console.log('Practice leaderboard seeded.');

        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
