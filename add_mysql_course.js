require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const mysqlCourse = {
    slug: 'mysql-database-course',
    title: 'MySQL Database Complete Course',
    icon: '🛢️',
    description: 'Master MySQL Database management, SQL commands, queries, and data types with this complete tutorial from Raj Technologies.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '4 Hours',
    level: 'Beginner',
    assignments: 0,
    highlights: [
        'Complete MySQL Installation & Setup',
        'Database Management & Architecture',
        'SQL Commands: DDL, DML, DQL',
        'Data Types in MySQL',
        'JDBC to MySQL Connectivity'
    ],
    lessons: [
        { lessonId: 'mysql-l1', title: 'What is MySQL? | Types of Database', videoUrl: 'https://www.youtube.com/embed/x6QdQxqJoFg?rel=0', pdfUrl: 'dummy_document.pdf', order: 1 },
        { lessonId: 'mysql-l2', title: 'SQL Introduction | Types of SQL Commands', videoUrl: 'https://www.youtube.com/embed/V2mJnBE9Ivo?rel=0', pdfUrl: 'dummy_document.pdf', order: 2 },
        { lessonId: 'mysql-l3', title: 'Download and Install MySQL Server 9', videoUrl: 'https://www.youtube.com/embed/ywLQvj-XYtE?rel=0', pdfUrl: 'dummy_document.pdf', order: 3 },
        { lessonId: 'mysql-l4', title: 'MySQL Data Types', videoUrl: 'https://www.youtube.com/embed/Pf0ei7SU2Io?rel=0', pdfUrl: 'dummy_document.pdf', order: 4 },
        { lessonId: 'mysql-l5', title: 'Master MySQL Database (Full Stack Module)', videoUrl: 'https://www.youtube.com/embed/WzymeZEzo00?rel=0', pdfUrl: 'dummy_document.pdf', order: 5 },
        { lessonId: 'mysql-l6', title: 'Java Database Connectivity (JDBC) to MySQL', videoUrl: 'https://www.youtube.com/embed/JLX4i8WmjAE?rel=0', pdfUrl: 'dummy_document.pdf', order: 6 },
    ],
    quizQuestions: [
        { question: 'What does SQL stand for?', options: ['Structured Question Language', 'Structured Query Language', 'Strong Question Language', 'Standard Query Language'], correctIndex: 1 },
        { question: 'Which SQL statement is used to extract data from a database?', options: ['EXTRACT', 'GET', 'SELECT', 'OPEN'], correctIndex: 2 },
        { question: 'Which SQL statement is used to update data in a database?', options: ['MODIFY', 'SAVE AS', 'UPDATE', 'CHANGE'], correctIndex: 2 },
        { question: 'Which SQL statement is used to delete data from a database?', options: ['REMOVE', 'DELETE', 'COLLAPSE', 'DROP'], correctIndex: 1 },
        { question: 'Which SQL statement is used to insert new data in a database?', options: ['ADD NEW', 'INSERT INTO', 'ADD RECORD', 'INSERT NEW'], correctIndex: 1 },
        { question: 'How do you select a column named "FirstName" from a table named "Persons"?', options: ['EXTRACT FirstName FROM Persons', 'SELECT Persons.FirstName', 'SELECT FirstName FROM Persons', 'GET FirstName FROM Persons'], correctIndex: 2 },
        { question: 'How do you select all columns from a table named "Persons"?', options: ['SELECT * FROM Persons', 'SELECT [all] FROM Persons', 'SELECT Persons', 'SELECT *.Persons'], correctIndex: 0 },
        { question: 'Which operator is used to search for a specified pattern in a column?', options: ['LIKE', 'GET', 'FROM', 'PATTERN'], correctIndex: 0 },
        { question: 'Which statement is used to create a new database?', options: ['CREATE DATABASE', 'BUILD DATABASE', 'NEW DATABASE', 'START DATABASE'], correctIndex: 0 },
        { question: 'Which command is a DDL command?', options: ['SELECT', 'INSERT', 'CREATE', 'UPDATE'], correctIndex: 2 }
    ],
    examPassPercent: 60,
    isActive: true,
    category: 'Tech'
};

async function addMySQLCourse() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connected');

        const exists = await Course.findOne({ slug: mysqlCourse.slug });
        if (exists) {
            await Course.findOneAndUpdate({ slug: mysqlCourse.slug }, mysqlCourse, { new: true });
            console.log(`🔄 Updated: ${mysqlCourse.title}`);
        } else {
            await Course.create(mysqlCourse);
            console.log(`✅ Created: ${mysqlCourse.title}`);
        }

        console.log('\n🎉 MySQL course added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error adding course:', err.message);
        process.exit(1);
    }
}

addMySQLCourse();
