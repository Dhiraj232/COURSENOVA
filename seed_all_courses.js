/**
 * seed_all_courses.js
 * Master seed file for RENVOX AI courses.
 * Contains 7 Free Courses and 3 Premium Courses.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course   = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox';

const allCourses = [
  // --- PREMIUM COURSES ---
  {
    slug: 'dsa-mastery',
    title: 'DSA Mastery',
    icon: '🧠',
    description: 'Master Data Structures & Algorithms from scratch to advanced level. Ace coding interviews at FAANG companies.',
    price: 499,
    isPremium: true,
    isFree: false,
    duration: '8 Weeks',
    level: 'Intermediate',
    assignments: 10,
    highlights: ['Arrays, Lists, Trees, Graphs', 'Complexity Analysis', 'Mock Interviews'],
    lessons: [
      { lessonId: 'dsa-l1', title: 'Arrays & Strings', videoUrl: 'https://www.youtube.com/embed/8hly31xKli0', pdfUrl: 'dummy_document.pdf', order: 1 },
      { lessonId: 'dsa-l2', title: 'Linked Lists', videoUrl: 'https://www.youtube.com/embed/R9PTBwOzceo', pdfUrl: 'dummy_document.pdf', order: 2 }
    ],
    quizQuestions: [
      { question: 'Binary search complexity?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n2)'], correctIndex: 1 },
      { question: 'Stack follows?', options: ['FIFO', 'LIFO', 'FILO', 'Random'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'anger-management',
    title: 'Anger Management & EQ',
    icon: '🧘',
    description: 'Transform your emotional intelligence and master techniques to stay calm under pressure.',
    price: 299,
    isPremium: true,
    isFree: false,
    duration: '4 Weeks',
    level: 'Beginner',
    assignments: 5,
    lessons: [
      { lessonId: 'am-l1', title: 'Understanding Triggers', videoUrl: 'https://www.youtube.com/embed/RVA2N6tX2cg', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Sudden anger tip?', options: ['Shout', 'Breathe deeply', 'Run', 'Ignore'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'communication-skills',
    title: 'Professional Communication',
    icon: '🎤',
    description: 'Speak and write with confidence. Perfect for interviews and presentations.',
    price: 399,
    isPremium: true,
    isFree: false,
    duration: '6 Weeks',
    level: 'Beginner',
    lessons: [
      { lessonId: 'cs-l1', title: 'Foundations', videoUrl: 'https://www.youtube.com/embed/HAnw168huqA', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Active listening is?', options: ['Talking', 'Concentrating on speaker', 'Phone check', 'Done'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },

  // --- FREE COURSES ---
  {
    slug: 'ai-prompt-engineering',
    title: 'Introduction to AI & Prompt Engineering',
    icon: '🤖',
    description: 'Learn to master ChatGPT and LLMs effectively for productivity.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    level: 'Beginner',
    lessons: [
      { lessonId: 'ai-l1', title: 'Generative AI', videoUrl: 'https://www.youtube.com/embed/G2fqAlgmoPo', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'LLM means?', options: ['Large Language Model', 'Low Logic', 'None', 'Main'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'web-dev-quickstart',
    title: 'Web Development Quickstart',
    icon: '🌐',
    description: 'HTML & CSS for absolute beginners. Build your first site.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '3 Weeks',
    lessons: [
      { lessonId: 'web-l1', title: 'HTML Foundations', videoUrl: 'https://www.youtube.com/embed/kUMe1FH4CHE', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'HTML stands for?', options: ['Hypertext Markup Language', 'None', 'Main', 'Tool'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'python-beginners',
    title: 'Python for Absolute Beginners',
    icon: '🐍',
    description: 'Learn logic and syntax with Python.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '4 Weeks',
    lessons: [
      { lessonId: 'py-l1', title: 'Variables', videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Python creator?', options: ['Guido', 'Elon', 'Mark', 'Bill'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'js-essentials',
    title: 'JavaScript Essentials',
    icon: '⚡',
    description: 'DOM manipulation and events.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '3 Weeks',
    lessons: [
      { lessonId: 'js-l1', title: 'DOM Intro', videoUrl: 'https://www.youtube.com/embed/5fb2aPlgoys', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Const is?', options: ['Variable', 'Constant', 'Loop', 'None'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'digital-marketing',
    title: 'Digital Marketing Fundamentals',
    icon: '📢',
    description: 'SEO and Social Media marketing.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    lessons: [
      { lessonId: 'dm-l1', title: 'SEO Intro', videoUrl: 'https://www.youtube.com/embed/vO_fN6P6WOk', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'SEO is?', options: ['Search Optimization', 'Social Opt', 'Main', 'None'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'graphic-design-canva',
    title: 'Graphic Design with Canva',
    icon: '🎨',
    description: 'Visuals for non-designers.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    lessons: [
      { lessonId: 'gd-l1', title: 'Canva Intro', videoUrl: 'https://www.youtube.com/embed/nBNVpWpG-74', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Canva is?', options: ['Design tool', 'Game', 'App', 'None'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'cyber-security',
    title: 'Cyber Security Awareness',
    icon: '🛡️',
    description: 'Stay safe online.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '1 Week',
    lessons: [
      { lessonId: 'sec-l1', title: 'Threats', videoUrl: 'https://www.youtube.com/embed/z5nc98S_T1w', pdfUrl: 'dummy_document.pdf', order: 1 }
    ],
    quizQuestions: [
      { question: 'Phishing is?', options: ['Fraud', 'Fishing', 'Main', 'None'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  }
];

async function seedAllCourses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    for (const c of allCourses) {
      const exists = await Course.findOne({ slug: c.slug });
      if (exists) {
        await Course.findOneAndUpdate({ slug: c.slug }, c, { new: true });
        console.log(`🔄 Updated: ${c.title}`);
      } else {
        await Course.create(c);
        console.log(`✅ Created: ${c.title}`);
      }
    }

    console.log('\n🎉 All 10 courses seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seedAllCourses();
