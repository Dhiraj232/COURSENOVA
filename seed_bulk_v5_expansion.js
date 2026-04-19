/**
 * seed_bulk_v5_expansion.js
 * Adds 14 new courses (7 Free, 7 Paid @ ₹99) to the CourseNova platform.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const newCourses = [
    // ─── FREE COURSES (7) ──────────────────────────────────────────────────
    {
        slug: 'ai-basics-beginners',
        title: 'AI Basics for Beginners',
        icon: '🤖',
        description: 'Understand the core foundations of AI and its real-world applications.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'aib-l1', title: 'Introduction to AI', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: Array.from({ length: 35 }, (_, i) => ({ question: `AI Basics Question ${i + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex: 0 }))
    },
    {
        slug: 'excel-data-analysis',
        title: 'Excel + Data Analysis Basics',
        icon: '📊',
        description: 'Master spreadsheets, essential formulas, and standard charts for data analysis.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '3 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'eda-l1', title: 'Excel Fundamentals', videoUrl: 'https://www.youtube.com/embed/rB6DpbgPE-E', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: Array.from({ length: 35 }, (_, i) => ({ question: `Excel Question ${i + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex: 0 }))
    },
    {
        slug: 'git-github-crash-course',
        title: 'Git & GitHub Crash Course',
        icon: '🐙',
        description: 'Learn version control and collaboration using Git and GitHub.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'git-l1', title: 'Git Basics', videoUrl: 'https://www.youtube.com/embed/RGOj5yH7evk', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: Array.from({ length: 35 }, (_, i) => ({ question: `Git Question ${i + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex: 0 }))
    },

    // ─── PREMIUM COURSES @ ₹99 (7) ──────────────────────────────────────────
    {
        slug: 'full-stack-web-mini',
        title: 'Full Stack Web Dev (Mini)',
        icon: '🕸️',
        description: 'A focused, crash course on building end-to-end applications with the MERN stack.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '4 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'fwm-l1', title: 'Express.js Fundamentals', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'What is MongoDB?', options: ['NoSQL Database', 'Programming Language', 'OS', 'Browser'], correctIndex: 0 }]
    },
    {
        slug: 'python-automation-quick',
        title: 'Python for Automation',
        icon: '🐍',
        description: 'Scripting for everyday tasks. Learn to automate file management, web scraping, and emails.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '3 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'paq-l1', title: 'Web Scraping with BeautifulSoup', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Which is a Python list?', options: ['[1, 2]', '{1, 2}', '(1, 2)', '<1, 2>'], correctIndex: 0 }]
    },
    {
        slug: 'data-visualization-ai',
        title: 'Data Viz with AI Tools',
        icon: '📊',
        description: 'Create interactive charts and dashboards using AI-assisted tools like Tableau and PowerBI.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '4 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'dv-l1', title: 'Storytelling with Data', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Tableau is for?', options: ['Data Viz', 'Cooking', 'Gaming', 'Writing'], correctIndex: 0 }]
    },
    {
        slug: 'ui-ux-design-masterclass',
        title: 'UI/UX Design Masterclass',
        icon: '✨',
        description: 'From wireframes to high-fidelity prototypes. Learn industry-standard design principles.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '6 Weeks',
        level: 'Advanced',
        isActive: true,
        lessons: [{ lessonId: 'uux-l1', title: 'User Research Methods', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'UX stands for?', options: ['User Experience', 'Unique X', 'None', 'Main'], correctIndex: 0 }]
    },
    {
        slug: 'social-media-branding',
        title: 'Social Media Branding',
        icon: '📱',
        description: 'Build your personal brand on LinkedIn and Twitter to attract top opportunities.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '3 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'smb-l1', title: 'LinkedIn Optimization', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'LinkedIn is for?', options: ['Professional networking', 'Watching movies', 'Gaming', 'None'], correctIndex: 0 }]
    },
    {
        slug: 'excel-powerbi-students',
        title: 'Excel & PowerBI Pro',
        icon: '📗',
        description: 'Essential data skills for every corporate job. Master pivot tables, DAX, and dashboards.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '5 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'epb-l1', title: 'Advanced Excel Formulas', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Which formula for sum?', options: ['SUM()', 'ADD()', 'PLUS()', 'TOTAL()'], correctIndex: 0 }]
    },
    {
        slug: 'reactjs-hero',
        title: 'React.js Zero to Hero',
        icon: '⚛️',
        description: 'Master the most popular frontend library. Components, Hooks, Context API, and Deployment.',
        price: 99,
        isPremium: true,
        isFree: false,
        duration: '6 Weeks',
        level: 'Advanced',
        isActive: true,
        lessons: [{ lessonId: 'rzh-l1', title: 'State & Props', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'React is a?', options: ['Library', 'Language', 'OS', 'Browser'], correctIndex: 0 }]
    }
];

async function seedBulk() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        for (const c of newCourses) {
            await Course.findOneAndUpdate(
                { slug: c.slug },
                { $set: c },
                { upsert: true, new: true }
            );
            console.log(`✅ Synced course: ${c.title} (Price: ₹${c.price})`);
        }

        console.log('\n🎉 Bulk V5 Expansion seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err.message);
        process.exit(1);
    }
}

seedBulk();
