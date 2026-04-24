require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const javaCourse = {
    slug: 'java-in-1-shot',
    title: 'Java in 1 Shot',
    icon: '☕',
    description: 'Master Java Programming in this complete 1-shot tutorial. Perfect for beginners looking to build a strong foundation.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '5 Hours',
    level: 'Beginner',
    assignments: 0,
    highlights: [
        'Complete Java Basics to Advanced',
        'Object-Oriented Programming (OOPs)',
        'Data Types, Variables & Conditionals',
        'Loops, Arrays & Strings',
        'Interview Preparation Topics'
    ],
    lessons: [
        {
            lessonId: 'java-l1',
            title: 'Java Complete Playlist',
            videoUrl: 'https://www.youtube.com/embed/videoseries?list=PLU2wpJsXyAjk0a--eMcRF3_47vIaL0Onj&rel=0',
            pdfUrl: 'dummy_document.pdf',
            order: 1
        }
    ],
    quizQuestions: [
        { question: 'Who invented Java?', options: ['James Gosling', 'Guido van Rossum', 'Bjarne Stroustrup', 'Dennis Ritchie'], correctIndex: 0 },
        { question: 'What is the extension of java code files?', options: ['.js', '.txt', '.class', '.java'], correctIndex: 3 },
        { question: 'Which of these cannot be used for a variable name in Java?', options: ['identifier & keyword', 'identifier', 'keyword', 'none of the mentioned'], correctIndex: 2 },
        { question: 'What is the default value of a boolean variable in Java?', options: ['true', 'false', 'null', 'not defined'], correctIndex: 1 },
        { question: 'Which keyword is used for accessing the features of a package?', options: ['package', 'import', 'extends', 'export'], correctIndex: 1 },
        { question: 'Which component is used to compile, debug and execute the java programs?', options: ['JRE', 'JIT', 'JDK', 'JVM'], correctIndex: 2 },
        { question: 'Which of these is not a primitive data type in Java?', options: ['int', 'float', 'String', 'char'], correctIndex: 2 },
        { question: 'What is the size of int variable in Java?', options: ['8 bit', '16 bit', '32 bit', '64 bit'], correctIndex: 2 },
        { question: 'Arrays in java are-', options: ['Object references', 'objects', 'Primitive data type', 'None'], correctIndex: 1 },
        { question: 'When is the object created with new keyword?', options: ['At run time', 'At compile time', 'Depends on the code', 'None'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true,
    category: 'Programming'
};

async function addJavaCourse() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        const exists = await Course.findOne({ slug: javaCourse.slug });
        if (exists) {
            await Course.findOneAndUpdate({ slug: javaCourse.slug }, javaCourse, { new: true });
            console.log(`🔄 Updated: ${javaCourse.title}`);
        } else {
            await Course.create(javaCourse);
            console.log(`✅ Created: ${javaCourse.title}`);
        }

        console.log('\n🎉 Java course added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding course:', err.message);
        process.exit(1);
    }
}

addJavaCourse();
