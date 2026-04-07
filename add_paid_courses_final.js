/**
 * add_paid_courses_final.js
 * Adds 7 new paid courses (₹59-₹129, ending in 9) to the Renvox AI platform.
 * These courses include full video lessons, PDFs, and Quizzes.
 * Existing ₹1 course and 7 Free courses are preserved.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox';

const newPaidCourses = [
    {
        slug: 'full-stack-web-mini',
        title: 'Full Stack Web Dev (Mini)',
        icon: '🕸️',
        description: 'A focused, crash course on building end-to-end applications with the MERN stack.',
        price: 129,
        isPremium: true,
        isFree: false,
        duration: '4 Weeks',
        level: 'Intermediate',
        isActive: true,
        highlights: ['MERN Stack', 'RESTful APIs', 'Database Design', 'Deployment'],
        lessons: [
            { lessonId: 'fwm-l1', title: 'Express.js Fundamentals', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'fwm-l2', title: 'React Integration', videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'What is MongoDB?', options: ['NoSQL Database', 'Programming Language', 'OS', 'Browser'], correctIndex: 0 },
            { question: 'React is for?', options: ['Frontend', 'Backend', 'Database', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'python-automation-quick',
        title: 'Python for Automation',
        icon: '🐍',
        description: 'Scripting for everyday tasks. Learn to automate file management, web scraping, and emails.',
        price: 89,
        isPremium: true,
        isFree: false,
        duration: '3 Weeks',
        level: 'Intermediate',
        isActive: true,
        highlights: ['Web Scraping', 'File Management', 'Automating Emails', 'Task Scheduling'],
        lessons: [
            { lessonId: 'paq-l1', title: 'Web Scraping with BeautifulSoup', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'paq-l2', title: 'Automating Excel Files', videoUrl: 'https://www.youtube.com/embed/6iF8Xb7Z3wQ', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'Which is a Python list?', options: ['[1, 2]', '{1, 2}', '(1, 2)', '<1, 2>'], correctIndex: 0 },
            { question: 'Which library is for scraping?', options: ['BeautifulSoup', 'Excel', 'Pandas', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'ui-ux-design-masterclass',
        title: 'UI/UX Design Masterclass',
        icon: '✨',
        description: 'From wireframes to high-fidelity prototypes. Learn industry-standard design principles.',
        price: 119,
        isPremium: true,
        isFree: false,
        duration: '6 Weeks',
        level: 'Advanced',
        isActive: true,
        highlights: ['Figma Mastery', 'User Research', 'Wireframing', 'Color Theory'],
        lessons: [
            { lessonId: 'uux-l1', title: 'User Research Methods', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'uux-l2', title: 'Wireframing in Figma', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'UX stands for?', options: ['User Experience', 'Unique X', 'None', 'Main'], correctIndex: 0 },
            { question: 'UI stands for?', options: ['User Interface', 'User Impact', 'None', 'Main'], correctIndex: 0 }
        ]
    },
    {
        slug: 'reactjs-hero',
        title: 'React.js Zero to Hero',
        icon: '⚛️',
        description: 'Master the most popular frontend library. Components, Hooks, Context API, and Deployment.',
        price: 109,
        isPremium: true,
        isFree: false,
        duration: '6 Weeks',
        level: 'Advanced',
        isActive: true,
        highlights: ['Hooks & Context', 'State Management', 'React Router', 'Clean Coding'],
        lessons: [
            { lessonId: 'rzh-l1', title: 'State & Props', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'rzh-l2', title: 'Custom Hooks', videoUrl: 'https://www.youtube.com/embed/SqcY0GlETPk', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'React is a?', options: ['Library', 'Language', 'OS', 'Browser'], correctIndex: 0 },
            { question: 'What hook is for state?', options: ['useState', 'useEffect', 'useRef', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'social-media-branding',
        title: 'Social Media Branding',
        icon: '📱',
        description: 'Build your personal brand on LinkedIn and Twitter to attract top opportunities.',
        price: 59,
        isPremium: true,
        isFree: false,
        duration: '3 Weeks',
        level: 'Intermediate',
        isActive: true,
        highlights: ['LinkedIn Optimization', 'Content Creation', 'Network Growth', 'Portfolio Building'],
        lessons: [
            { lessonId: 'smb-l1', title: 'LinkedIn Optimization', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'smb-l2', title: 'Twitter for Networking', videoUrl: 'https://www.youtube.com/embed/HAnw168huqA', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'LinkedIn is for?', options: ['Professional networking', 'Watching movies', 'Gaming', 'None'], correctIndex: 0 },
            { question: 'Personal brand helps in?', options: ['Jobs', 'Sleep', 'Gaming', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'excel-powerbi-students',
        title: 'Excel & PowerBI Pro',
        icon: '📗',
        description: 'Essential data skills for every corporate job. Master pivot tables, DAX, and dashboards.',
        price: 69,
        isPremium: true,
        isFree: false,
        duration: '5 Weeks',
        level: 'Intermediate',
        isActive: true,
        highlights: ['Pivot Tables', 'DAX Formulas', 'Dashboard Design', 'Data Cleaning'],
        lessons: [
            { lessonId: 'epb-l1', title: 'Advanced Excel Formulas', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'epb-l2', title: 'PowerBI Dashboards', videoUrl: 'https://www.youtube.com/embed/8-T-R_41fO8', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'Which formula for sum?', options: ['SUM()', 'ADD()', 'PLUS()', 'TOTAL()'], correctIndex: 0 },
            { question: 'PowerBI is for?', options: ['Data Viz', 'Gaming', 'Writing', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'data-visualization-ai',
        title: 'Data Viz with AI Tools',
        icon: '📊',
        description: 'Create interactive charts and dashboards using AI-assisted tools like Tableau and PowerBI.',
        price: 79,
        isPremium: true,
        isFree: false,
        duration: '4 Weeks',
        level: 'Intermediate',
        isActive: true,
        highlights: ['Tableau Basics', 'AI Dashboards', 'Storytelling', 'Data Insights'],
        lessons: [
            { lessonId: 'dv-l1', title: 'Storytelling with Data', videoUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY', pdfUrl: 'dummy_document.pdf', order: 1 },
            { lessonId: 'dv-l2', title: 'Automated Charting', videoUrl: 'https://www.youtube.com/embed/vO_fN6P6WOk', pdfUrl: 'dummy_document.pdf', order: 2 }
        ],
        quizQuestions: [
            { question: 'Tableau is for?', options: ['Data Viz', 'Cooking', 'Gaming', 'Writing'], correctIndex: 0 },
            { question: 'Pie charts are for?', options: ['Proportions', 'Timelines', 'Locations', 'None'], correctIndex: 0 }
        ]
    }
];

async function seedPaidCourses() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        for (const c of newPaidCourses) {
            const exists = await Course.findOne({ slug: c.slug });
            if (exists) {
                await Course.findOneAndUpdate({ slug: c.slug }, c, { new: true });
                console.log(`🔄 Updated: ${c.title} (Price: ₹${c.price})`);
            } else {
                await Course.create(c);
                console.log(`✅ Created: ${c.title} (Price: ₹${c.price})`);
            }
        }

        console.log('\n🎉 Successfully added 7 course with prices ending in 9!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err.message);
        process.exit(1);
    }
}

seedPaidCourses();
