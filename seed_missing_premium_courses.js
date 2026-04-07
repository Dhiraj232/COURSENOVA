/**
 * seed_missing_premium_courses.js
 * Adds the courses that are currently missing in MongoDB but present in frontend FALLBACK_DATA.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course   = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const missingCourses = [
  {
    slug: 'web-development-bootcamp',
    title: 'Web Development Bootcamp',
    icon: '💻',
    description: 'Complete full-stack web development course from HTML/CSS to Node.js and React.',
    price: 499,
    isPremium: true,
    isFree: false,
    duration: '12 Weeks',
    level: 'Beginner',
    isActive: true,
    lessons: [
        { lessonId: 'wb-l1', title: 'HTML & CSS Basics', videoUrl: 'https://www.youtube.com/embed/ysEN5RaKOlA', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
        { question: 'HTML stands for?', options: ['HyperText Markup Language', 'High Text Machine Language', 'None', 'Tool'], correctIndex: 0 }
    ]
  },
  {
    slug: 'c-programming-fundamentals',
    title: 'C Programming Fundamentals',
    icon: '⌨️',
    description: 'Master the foundations of programming with C. Perfect for engineering students.',
    price: 399,
    isPremium: true,
    isFree: false,
    duration: '6 Weeks',
    level: 'Beginner',
    isActive: true,
    lessons: [
        { lessonId: 'c-l1', title: 'Introduction to C', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
        { question: 'Which is a keyword in C?', options: ['int', 'print', 'scan', 'main'], correctIndex: 0 }
    ]
  },
  {
    slug: 'python-data-science',
    title: 'Python for Data Science',
    icon: '📊',
    description: 'Learn Python libraries like Pandas, Numpy, and Matplotlib for data analysis.',
    price: 599,
    isPremium: true,
    isFree: false,
    duration: '8 Weeks',
    level: 'Intermediate',
    isActive: true,
    lessons: [
        { lessonId: 'pds-l1', title: 'Pandas Basics', videoUrl: 'https://www.youtube.com/embed/LHBE0usLVCI', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
        { question: 'Which library is used for dataframes?', options: ['Numpy', 'Pandas', 'Scipy', 'None'], correctIndex: 1 }
    ]
  },
  {
    slug: 'database-management-systems',
    title: 'Database Management Systems',
    icon: '🗄️',
    description: 'Learn SQL and relational database design principles.',
    price: 449,
    isPremium: true,
    isFree: false,
    duration: '6 Weeks',
    level: 'Intermediate',
    isActive: true,
    lessons: [
        { lessonId: 'db-l1', title: 'SQL Queries', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
        { question: 'SQL stands for?', options: ['Structured Query Language', 'Simple Question Link', 'None', 'Main'], correctIndex: 0 }
    ]
  },
  {
    slug: 'javascript-advanced',
    title: 'JavaScript Advanced',
    icon: '📜',
    description: 'Deep dive into asynchronous JS, closures, prototypes, and modern ES6+ patterns.',
    price: 449,
    isPremium: true,
    isFree: false,
    duration: '8 Weeks',
    level: 'Advanced',
    isActive: true,
    lessons: [
        { lessonId: 'js-adv-l1', title: 'Closures & Scope', videoUrl: 'https://www.youtube.com/embed/3a0I8ICR1Vg', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
        { question: 'What is a closure?', options: ['Function with its lexical environment', 'A private variable', 'A way to close a file', 'None'], correctIndex: 0 }
    ]
  },
  {
    quizQuestions: [
        { question: 'Pomodoro technique uses how many minutes?', options: ['25', '50', '60', '10'], correctIndex: 0 }
    ]
  },
  {
    slug: 'renvox-ai-masterclass',
    title: 'Renvox AI Masterclass',
    icon: '🚀',
    description: 'A complete guided masterclass on using Renvox AI to its full potential. Includes hands-on projects and a verified certificate.',
    price: 1, // SPECIAL ₹1 FOR TESTING
    isPremium: true,
    isFree: false,
    duration: '1 Week',
    level: 'Beginner',
    isActive: true,
    lessons: [
        { 
            lessonId: 'rm-l1', 
            title: 'Welcome to Renvox AI', 
            videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', // Valid embed
            pdfUrl: 'renvox_guide.pdf', 
            order: 1 
        }
    ],
    quizQuestions: [
        { 
            question: 'What is the primary goal of Renvox AI?', 
            options: ['To help you learn', 'To play games', 'To watch movies', 'None'], 
            correctIndex: 0 
        }
    ]
  }
];

async function seedMissing() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    for (const c of missingCourses) {
      await Course.findOneAndUpdate(
          { slug: c.slug },
          { $set: c },
          { upsert: true, new: true }
      );
      console.log(`✅ Synced course: ${c.title} (Price: ₹${c.price})`);
    }

    console.log('\n🎉 Missing courses seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seedMissing();
