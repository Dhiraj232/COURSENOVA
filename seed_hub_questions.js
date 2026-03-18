const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('./models/Question');

const demoQuestions = [
    {
        question: "Which data structure follows the LIFO principle?",
        options: ["Queue", "Stack", "Linked List", "Tree"],
        correctAnswer: "Stack",
        category: "DSA",
        difficulty: "easy"
    },
    {
        question: "What does HTML stand for?",
        options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Tabular Menu List", "Home Tool Markup Language"],
        correctAnswer: "Hyper Text Markup Language",
        category: "Web Dev",
        difficulty: "easy"
    },
    {
        question: "Which of these is NOT a Javascript framework?",
        options: ["React", "Angular", "Vue", "Django"],
        correctAnswer: "Django",
        category: "Web Dev",
        difficulty: "medium"
    },
    {
        question: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
        correctAnswer: "O(log n)",
        category: "DSA",
        difficulty: "medium"
    },
    {
        question: "In AI, what does NLP stand for?",
        options: ["Natural Lifting Process", "Neural Level Programming", "Natural Language Processing", "Node Link Protocol"],
        correctAnswer: "Natural Language Processing",
        category: "AI",
        difficulty: "easy"
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await Question.insertMany(demoQuestions);
        console.log("Successfully seeded 5 additional practice hub questions!");
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

seed();
