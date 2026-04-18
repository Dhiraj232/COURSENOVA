const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const NEW_COURSES = [
    {
        title: 'AI Basics for Beginners',
        slug: 'ai-basics-beginners',
        icon: '🤖',
        description: 'Understand the core concepts of Artificial Intelligence, its history, and how it is shaping the future.',
        highlights: ['History of AI', 'Machine Learning Basics', 'Ethical AI', 'Generative AI Intro'],
        level: 'Beginner',
        duration: '2 Weeks'
    },
    {
        title: 'Python Programming',
        slug: 'python-programming-foundation',
        icon: '🐍',
        description: 'Learn the most popular programming language from scratch. Perfect for data science, web development, and automation.',
        highlights: ['Variables & Data Types', 'Control Flow (If/Else)', 'Loops & Functions', 'Python Projects'],
        level: 'Beginner',
        duration: '3 Weeks'
    },
    {
        title: 'Data Science Basics with AI',
        slug: 'data-science-ai-basics',
        icon: '📊',
        description: 'Explore the intersection of Data Science and AI. Learn how to collect, analyze, and visualize data.',
        highlights: ['What is Data Science?', 'Data Visualization', 'Intro to Statistics', 'AI in Data Analysis'],
        level: 'Beginner',
        duration: '3 Weeks'
    },
    {
        title: 'Excel & Data Analysis Basics',
        slug: 'excel-data-analysis',
        icon: '📈',
        description: 'Master the essential Excel skills for data entry, cleaning, and basic reporting.',
        highlights: ['Excel Interface', 'Formulas & Functions', 'Pivot Tables', 'Chart Creation'],
        level: 'Beginner',
        duration: '2 Weeks'
    },
    {
        title: 'Git & GitHub Crash Course',
        slug: 'git-github-crash-course',
        icon: '🐙',
        description: 'Essential version control skills for every developer. Host projects and collaborate on GitHub.',
        highlights: ['Git Installation', 'Commits & Braches', 'Pushing to GitHub', 'Collaborative Coding'],
        level: 'Beginner',
        duration: '1 Week'
    }
];

function generateLessons(courseTitle) {
    return [
        {
            lessonId: 'm1',
            title: 'Welcome & Introduction',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Dummy video
            pdfUrl: '/dummy_document.pdf',
            order: 1
        },
        {
            lessonId: 'm2',
            title: 'Core Fundamental Concepts',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 2
        },
        {
            lessonId: 'm3',
            title: 'Practical Hands-on Session',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 3
        },
        {
            lessonId: 'm4',
            title: 'Advanced Tips & Best Practices',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 4
        }
    ];
}

function generateQuiz() {
    return [
        { question: 'What is the primary goal of this module?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndex: 0 },
        { question: 'Which tool is most efficient for this task?', options: ['Tool X', 'Tool Y', 'Tool Z', 'Tool W'], correctIndex: 1 },
        { question: 'What does the term "Efficiency" mean in this context?', options: ['Speed', 'Cost', 'Resource Usage', 'All of above'], correctIndex: 3 },
        { question: 'True or False: This concept is widely used in industry.', options: ['True', 'False', 'Neither', 'Both'], correctIndex: 0 },
        { question: 'What is the first step in the process?', options: ['Step 1', 'Step 2', 'Step 3', 'Step 4'], correctIndex: 0 }
    ];
}

async function run() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Delete all existing Free courses
        console.log('🗑️  Deleting all existing FREE courses...');
        const deleteRes = await Course.deleteMany({ $or: [{ isFree: true }, { price: 0 }] });
        console.log(`✅ Deleted ${deleteRes.deletedCount} courses.`);

        // 2. Add New Courses
        console.log('📦 Seeding new Free Foundation Courses...');
        for (const cData of NEW_COURSES) {
            console.log(`   📝 Adding: ${cData.title}...`);
            await Course.create({
                ...cData,
                price: 0,
                isFree: true,
                isPremium: false,
                assignments: 4,
                lessons: generateLessons(cData.title),
                quizQuestions: generateQuiz(),
                isActive: true
            });
        }

        console.log('\n✨ FREE FOUNDATION OVERHAUL COMPLETE!');
        console.log(`   - Added 5 specific tech courses.`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
