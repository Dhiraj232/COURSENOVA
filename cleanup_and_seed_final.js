/**
 * cleanup_and_seed_final.js
 * 1. Deletes all courses with price > 100.
 * 2. Ensures exactly 14 courses exist (7 Free, 7 Premium @ ₹99).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const targetCourses = [
    // ─── FREE COURSES (7) ──────────────────────────────────────────────────
    {
        slug: 'generative-ai-for-everyone',
        title: 'Generative AI for Everyone',
        icon: '🤖',
        description: 'Understand the basics of LLMs, Diffusion models, and how to use AI in daily life.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'gai-l1', title: 'Introduction to GenAI', videoUrl: 'https://www.youtube.com/embed/2u_A0f-HPrQ', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'What does LLM stand for?', options: ['Large Language Model', 'Low Level Machine', 'Little Log Method', 'None'], correctIndex: 0 }]
    },
    {
        slug: 'chatgpt-essentials-students',
        title: 'ChatGPT Essentials for Students',
        icon: '💬',
        description: 'Master ChatGPT for academic research, assignment drafting, and concept simplification.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '1 Week',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'cgpt-l1', title: 'Smart Academic Prompting', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Can ChatGPT generate code?', options: ['Yes', 'No', 'Maybe', 'Only Python'], correctIndex: 0 }]
    },
    {
        slug: 'modern-web-design-ai',
        title: 'Modern Web Design with AI',
        icon: '🎨',
        description: 'Learn how to use AI tools like Midjourney and Figma AI to design stunning websites.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '3 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'mwa-l1', title: 'AI-First Design Thinking', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Which tool is for UI design?', options: ['Figma', 'Excel', 'VLC', 'Notepad'], correctIndex: 0 }]
    },
    {
        slug: 'prompt-engineering-101',
        title: 'Prompt Engineering 101',
        icon: '✍️',
        description: 'The art of communicating with AI. Learn advanced prompting techniques like Chain-of-Thought.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Intermediate',
        isActive: true,
        lessons: [{ lessonId: 'pe-l1', title: 'Zero-shot vs Few-shot', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'What is a system prompt?', options: ['Instruction to the AI', 'A computer boot message', 'A user question', 'None'], correctIndex: 0 }]
    },
    {
        slug: 'digital-marketing-with-ai',
        title: 'Digital Marketing with AI',
        icon: '📈',
        description: 'Automate content creation and SEO using artificial intelligence tools.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '4 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'dm-l1', title: 'AI for Content Strategy', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'SEO stands for?', options: ['Search Engine Optimization', 'Simple Entry Order', 'None', 'Main'], correctIndex: 0 }]
    },
    {
        slug: 'soft-skills-for-engineers',
        title: 'Soft Skills for Engineers',
        icon: '🤝',
        description: 'Communication, teamwork, and leadership skills tailored for technical students.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'ske-l1', title: 'Effective Technical Communication', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Listening is a?', options: ['Soft skill', 'Hard skill', 'Tool', 'Weapon'], correctIndex: 0 }]
    },
    {
        slug: 'career-success-guide',
        title: 'Career Success Guide',
        icon: '🎓',
        description: 'Resume building, interview prep, and long-term career planning for Indian students.',
        price: 0,
        isPremium: false,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        isActive: true,
        lessons: [{ lessonId: 'csg-l1', title: 'Building a Strong Resume', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0', pdfUrl: 'dummy.pdf', order: 1 }],
        quizQuestions: [{ question: 'Is PDF preferred for resumes?', options: ['Yes', 'No', 'Maybe', 'Use Text file'], correctIndex: 0 }]
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

async function cleanupAndSeed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Delete courses with price > 100
        const delResult = await Course.deleteMany({ price: { $gt: 100 } });
        console.log(`✅ Deleted ${delResult.deletedCount} expensive courses (> ₹100)`);

        // 2. Identify slugs we want to keep
        const targetSlugs = targetCourses.map(c => c.slug);

        // 3. Delete any courses that are NOT in our target list (to keep exactly 14)
        const delExtraResult = await Course.deleteMany({ slug: { $nin: targetSlugs } });
        console.log(`✅ Deleted ${delExtraResult.deletedCount} other courses to maintain catalog size`);

        // 4. Sync target courses
        for (const c of targetCourses) {
            await Course.findOneAndUpdate(
                { slug: c.slug },
                { $set: c },
                { upsert: true, new: true }
            );
            console.log(`✅ Synced course: ${c.title} (Price: ₹${c.price})`);
        }

        console.log('\n🎉 Database synchronized: Exactly 14 courses active!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup/Seeding error:', err.message);
        process.exit(1);
    }
}

cleanupAndSeed();
