require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const cCourse = {
    slug: 'c-programming-fundamentals',
    title: 'C Programming Fundamentals',
    icon: '💻',
    description: 'Learn C Programming from scratch in this complete beginner-friendly tutorial. Master all fundamental concepts and build a strong programming base.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '6 Hours',
    level: 'Beginner',
    assignments: 0,
    highlights: [
        'Complete C Language from Basics',
        'Variables, Data Types & Operators',
        'Control Flow, Loops & Functions',
        'Arrays, Pointers & Strings',
        'File Handling & Interview Prep'
    ],
    lessons: [
        {
            lessonId: 'c-l1',
            title: 'C Programming Complete Course',
            videoUrl: 'https://www.youtube.com/embed/videoseries?list=PLU2wpJsXyAjnD1eXNVEHXFfRL2gShVEN5&rel=0',
            pdfUrl: 'dummy_document.pdf',
            order: 1
        }
    ],
    quizQuestions: [
        { question: 'Who developed the C programming language?', options: ['Dennis Ritchie', 'Bjarne Stroustrup', 'James Gosling', 'Guido van Rossum'], correctIndex: 0 },
        { question: 'Which of the following is a valid C variable name?', options: ['2variable', 'variable_2', 'variable-2', 'variable 2'], correctIndex: 1 },
        { question: 'What is the correct syntax to print "Hello" in C?', options: ['print("Hello")', 'cout << "Hello"', 'printf("Hello")', 'System.out.println("Hello")'], correctIndex: 2 },
        { question: 'Which header file is required for printf()?', options: ['<string.h>', '<math.h>', '<stdio.h>', '<stdlib.h>'], correctIndex: 2 },
        { question: 'What does the & operator do in C?', options: ['Multiplication', 'Address of', 'Value at address', 'Bitwise OR'], correctIndex: 1 },
        { question: 'Which loop checks the condition at the end in C?', options: ['for loop', 'while loop', 'do-while loop', 'None of these'], correctIndex: 2 },
        { question: 'What is the size of int in C (on 32-bit systems)?', options: ['1 byte', '2 bytes', '4 bytes', '8 bytes'], correctIndex: 2 },
        { question: 'Which keyword is used to return a value from a function?', options: ['exit', 'break', 'return', 'yield'], correctIndex: 2 },
        { question: 'What is a pointer in C?', options: ['A variable that stores values', 'A variable that stores memory addresses', 'A function', 'A data type'], correctIndex: 1 },
        { question: 'Which symbol is used to access a struct member through a pointer?', options: ['.', '->', '::', '::'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true,
    category: 'Programming'
};

async function addCCourse() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        const exists = await Course.findOne({ slug: cCourse.slug });
        if (exists) {
            await Course.findOneAndUpdate({ slug: cCourse.slug }, cCourse, { new: true });
            console.log(`🔄 Updated: ${cCourse.title}`);
        } else {
            await Course.create(cCourse);
            console.log(`✅ Created: ${cCourse.title}`);
        }

        console.log('\n🎉 C Programming course added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding course:', err.message);
        process.exit(1);
    }
}

addCCourse();
