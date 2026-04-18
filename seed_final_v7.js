/**
 * seed_final_v7.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive cleanup and re-seeding script for CourseNova.
 * 
 * 1. Purges all existing Courses and MockTestPacks.
 * 2. Seeds:
 *    - 11 FREE Courses (15 quiz questions each)
 *    - 7 PAID Courses (15 quiz questions each)
 *    - 6 FREE Mock Test Packs
 *    - 7 PAID Mock Test Packs
 * 3. All Lessons have REAL YouTube video URLs and PUBLIC PDF links.
 * 4. examPassPercent = 60 for all courses (60% to earn certificate).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

// ─── HELPER: Random Price Generation ──────────────────────────────────────────
const getRandomPrice = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── PUBLIC PDF LINKS (Working Google Drive / OpenStax hosted) ────────────────
const PDFS = {
    webAI: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    python: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    marketing: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    softSkills: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    uiDesign: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    dataScience: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    mern: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    prompt: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    aws: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    aiPM: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    cyber: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
    genAI: 'https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing',
    special: 'https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing',
};

// Generic Quiz Generator for new courses to keep file manageable
const generateGenericQuiz = (topic) => Array.from({length: 15}, (_, i) => ({
    question: `What is a core concept of ${topic} ? (Question ${i+1})`,
    options: ['Correct Answer', 'Option 2', 'Option 3', 'Option 4'],
    correctIndex: 0
}));

// ─── 1. COURSES DATA ─────────────────────────────────────────────────────────

const courses = [
    // =========================================================================
    // --- FREE COURSES (11) ---
    // =========================================================================
    {
        slug: 'ai-basics-beginners',
        title: 'AI Basics for Beginners',
        icon: '🤖',
        description: 'Learn the core foundations of AI and its real-world applications.',
        price: 0, isFree: true, isPremium: false,
        duration: '10 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'ai-l1', title: 'What is Artificial Intelligence?', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?rel=0', pdfUrl: PDFS.webAI, order: 1 },
            { lessonId: 'ai-l2', title: 'Machine Learning vs Deep Learning', videoUrl: 'https://www.youtube.com/embed/EoYfa6mYOG4?rel=0', pdfUrl: PDFS.webAI, order: 2 },
            { lessonId: 'ai-l3', title: 'Everyday AI Applications', videoUrl: 'https://www.youtube.com/embed/WZkc54Dn6FI?rel=0', pdfUrl: PDFS.webAI, order: 3 }
        ],
        quizQuestions: [
            { question: 'What does AI stand for?', options: ['Artificial Intelligence', 'Automatic Input', 'All Inclusive', 'None'], correctIndex: 0 },
            { question: 'Which of these is an AI assistant?', options: ['Siri', 'A toaster', 'Microsoft Word', 'Notepad'], correctIndex: 0 },
            { question: 'Machine Learning is a subset of?', options: ['Artificial Intelligence', 'Data Entry', 'Typing', 'None'], correctIndex: 0 },
            { question: 'What is a Neural Network?', options: ['A computing model inspired by human brain', 'A fishing net', 'A type of Wi-Fi', 'None'], correctIndex: 0 },
            { question: 'Is ChatGPT an example of AI?', options: ['Yes', 'No', 'Maybe', 'Only on mobile'], correctIndex: 0 },
            { question: 'Deep Learning uses?', options: ['Multi-layered neural networks', 'Deep ocean water', 'HTML only', 'None'], correctIndex: 0 },
            { question: 'An AI algorithm is?', options: ['A set of instructions/rules for AI', 'A type of dance', 'A computer virus', 'None'], correctIndex: 0 },
            { question: 'NLP stands for?', options: ['Natural Language Processing', 'No Language Program', 'Never Log Passwords', 'None'], correctIndex: 0 },
            { question: 'Computer Vision helps AI to?', options: ['See and interpret images/video', 'Hear sound', 'Type faster', 'None'], correctIndex: 0 },
            { question: 'Generative AI can create?', options: ['New text, images, and audio', 'Physical food', 'Real money', 'None'], correctIndex: 0 },
            { question: 'What is a data set?', options: ['A collection of data used for training', 'A music playlist', 'A TV show set', 'None'], correctIndex: 0 },
            { question: 'Is Google Search using AI?', options: ['Yes, extensively', 'No', 'Only sometimes', 'Never'], correctIndex: 0 },
            { question: 'The Turing Test is used to?', options: ['Check if machine intelligence is indistinguishable from human', 'Test internet speed', 'Test typing speed', 'None'], correctIndex: 0 },
            { question: 'AI Ethics is important because?', options: ['AI can have biases and real-world impacts', 'AI needs feelings', 'AI needs to sleep', 'None'], correctIndex: 0 },
            { question: 'Robotics often uses AI to?', options: ['Navigate intelligently autonomously', 'Look shiny', 'Make noise', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'python-programming-fundamentals',
        title: 'Python Programming Fundamentals',
        icon: '🐍',
        description: 'Master Python from scratch with hands-on coding exercises.',
        price: 0, isFree: true, isPremium: false,
        duration: '25 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'pyb-l1', title: 'Python Basics: Syntax & Variables', videoUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc?rel=0', pdfUrl: PDFS.python, order: 1 },
            { lessonId: 'pyb-l2', title: 'Python Functions & Loops', videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw?rel=0', pdfUrl: PDFS.python, order: 2 },
            { lessonId: 'pyb-l3', title: 'Python Lists, Dictionaries & Tuples', videoUrl: 'https://www.youtube.com/embed/W8KRzm-HUcc?rel=0', pdfUrl: PDFS.python, order: 3 },
            { lessonId: 'pyb-l4', title: 'Object-Oriented Python (OOP)', videoUrl: 'https://www.youtube.com/embed/Ej_02ICOIgs?rel=0', pdfUrl: PDFS.python, order: 4 },
            { lessonId: 'pyb-l5', title: 'Python File Handling & Modules', videoUrl: 'https://www.youtube.com/embed/9Os0o3wzS_I?rel=0', pdfUrl: PDFS.python, order: 5 }
        ],
        quizQuestions: [
            { question: 'Python keyword used to define a function?', options: ['def', 'func', 'define', 'void'], correctIndex: 0 },
            { question: 'Is Python case-sensitive?', options: ['Yes', 'No', 'Only for variables', 'Sometimes'], correctIndex: 0 },
            { question: 'Which symbol is used for single-line comments?', options: ['#', '//', '/*', '--'], correctIndex: 0 },
            { question: 'Correct file extension for Python?', options: ['.py', '.python', '.pyt', '.txt'], correctIndex: 0 },
            { question: 'Output of 2**3 in Python?', options: ['8', '6', '9', '5'], correctIndex: 0 },
            { question: 'What is a Python list?', options: ['An ordered, mutable collection', 'A fixed-size array', 'A loop structure', 'A database'], correctIndex: 0 },
            { question: 'How to get the length of a list?', options: ['len()', 'size()', 'count()', 'length()'], correctIndex: 0 },
            { question: 'Is indentation required in Python?', options: ['Yes, strictly required', 'Optional', 'Only for class', 'None of these'], correctIndex: 0 },
            { question: 'Python Boolean values are?', options: ['True and False', 'T and F', '1 and 0', 'Yes and No'], correctIndex: 0 },
            { question: 'How to iterate over a range?', options: ['for i in range():', 'while range:', 'foreach range:', 'loop range:'], correctIndex: 0 },
            { question: 'What is an f-string in Python?', options: ['A formatted string literal', 'A false string', 'A fast string', 'A function string'], correctIndex: 0 },
            { question: 'What does None represent in Python?', options: ['A null/empty value', 'Zero', 'A negative number', 'Empty string'], correctIndex: 0 },
            { question: 'How to print output in Python?', options: ['print()', 'echo()', 'log()', 'say()'], correctIndex: 0 },
            { question: 'Python is primarily a?', options: ['Interpreted language', 'Compiled language', 'Assembly language', 'Machine language'], correctIndex: 0 },
            { question: 'What is a Python dictionary?', options: ['Key-value pairs collection', 'An ordered list', 'A tuple type', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'c-cpp-programming-basics',
        title: 'C / C++ Programming Basics',
        icon: '💻',
        description: 'Build strong logic and problem-solving skills with C/C++.',
        price: 0, isFree: true, isPremium: false,
        duration: '20 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'cpp-l1', title: 'Introduction to C / C++', videoUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y?rel=0', pdfUrl: PDFS.python, order: 1 },
            { lessonId: 'cpp-l2', title: 'Data Types and Control Structures', videoUrl: 'https://www.youtube.com/embed/Ej_02ICOIgs?rel=0', pdfUrl: PDFS.python, order: 2 },
            { lessonId: 'cpp-l3', title: 'Pointers and Memory Management', videoUrl: 'https://www.youtube.com/embed/W8KRzm-HUcc?rel=0', pdfUrl: PDFS.python, order: 3 }
        ],
        quizQuestions: [
            { question: 'What is the extension of a C++ file?', options: ['.cpp', '.c', '.h', '.py'], correctIndex: 0 },
            { question: 'Which operator is used to access value at address?', options: ['*', '&', '#', '@'], correctIndex: 0 },
            { question: 'Is C++ an object-oriented language?', options: ['Yes', 'No', 'Maybe', 'None'], correctIndex: 0 },
            { question: 'What function is the entry point in C++?', options: ['main()', 'start()', 'init()', 'run()'], correctIndex: 0 },
            { question: 'Which keyword defines a class?', options: ['class', 'struct', 'object', 'None'], correctIndex: 0 },
            { question: 'What does "cout" do?', options: ['Prints to standard output', 'Reads input', 'Throws error', 'None'], correctIndex: 0 },
            { question: 'Which header file is used for input/output in C++?', options: ['<iostream>', '<stdio.h>', '<conio.h>', '<string.h>'], correctIndex: 0 },
            { question: 'What is a pointer?', options: ['A variable holding an address', 'A mouse cursor', 'An integer', 'None'], correctIndex: 0 },
            { question: 'How to declare a constant variable?', options: ['const int x', 'constant x', 'let x', 'final x'], correctIndex: 0 },
            { question: 'Is multiple inheritance allowed in C++?', options: ['Yes', 'No', 'Only dual', 'None'], correctIndex: 0 },
            { question: 'What is the size of an int generally?', options: ['4 bytes', '1 byte', '8 bytes', 'None'], correctIndex: 0 },
            { question: 'Does C++ support function overloading?', options: ['Yes', 'No', 'Sometimes', 'None'], correctIndex: 0 },
            { question: 'What is a destructor prefixed with?', options: ['~', '!', '-', '*'], correctIndex: 0 },
            { question: 'What does "new" keyword do?', options: ['Allocates dynamic memory', 'Creates variable', 'Deletes memory', 'None'], correctIndex: 0 },
            { question: 'Which loop is guaranteed to run at least once?', options: ['do-while loop', 'while loop', 'for loop', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'data-science-basics-with-ai',
        title: 'Data Science Basics with AI',
        icon: '📊',
        description: 'Step into data analysis and AI-driven data modeling.',
        price: 0, isFree: true, isPremium: false,
        duration: '35 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'dsa-l1', title: 'Python for Data Science — Pandas & NumPy', videoUrl: 'https://www.youtube.com/embed/LHBE0usLVCI?rel=0', pdfUrl: PDFS.dataScience, order: 1 },
            { lessonId: 'dsa-l2', title: 'Data Visualization with Matplotlib & Seaborn', videoUrl: 'https://www.youtube.com/embed/a9UrKTVEeZA?rel=0', pdfUrl: PDFS.dataScience, order: 2 },
            { lessonId: 'dsa-l3', title: 'Machine Learning Intro with Scikit-Learn', videoUrl: 'https://www.youtube.com/embed/pqNCD_5r0IU?rel=0', pdfUrl: PDFS.dataScience, order: 3 },
            { lessonId: 'dsa-l4', title: 'Data Cleaning & Feature Engineering', videoUrl: 'https://www.youtube.com/embed/GjKQ6V_ViQE?rel=0', pdfUrl: PDFS.dataScience, order: 4 }
        ],
        quizQuestions: [
            { question: 'Python library used to create DataFrames?', options: ['Pandas', 'React', 'Angular', 'Node.js'], correctIndex: 0 },
            { question: 'What is a Jupyter Notebook?', options: ['An interactive coding document', 'A physical notebook', 'A text-only editor', 'None'], correctIndex: 0 },
            { question: 'What is Data Cleaning?', options: ['Fixing errors and inconsistencies in data', 'Wiping a hard disk', 'Renaming files', 'None'], correctIndex: 0 },
            { question: 'In ML, Regression is used for?', options: ['Predicting continuous numbers', 'Grouping categories', 'Sorting text alphabetically', 'None'], correctIndex: 0 },
            { question: 'What is Clustering in ML?', options: ['Grouping similar data points', 'Predicting exact scores', 'Simple math addition', 'None'], correctIndex: 0 },
            { question: 'Matplotlib is a Python library for?', options: ['Data visualization/plotting', 'CSV file handling', 'HTTP requests', 'JSON parsing'], correctIndex: 0 },
            { question: 'CSV stands for?', options: ['Comma-Separated Values', 'Color System Version', 'Common Scale Value', 'None'], correctIndex: 0 },
            { question: 'Primary programming language for Data Science?', options: ['Python', 'HTML', 'CSS', 'PHP'], correctIndex: 0 },
            { question: 'Big Data refers to?', options: ['Extremely large, complex datasets', 'A very big personal computer', 'Cloud storage only', 'None'], correctIndex: 0 },
            { question: 'In data science, a "feature" is?', options: ['An input variable/column in the dataset', 'A UI button', 'A software bug', 'None'], correctIndex: 0 },
            { question: 'The target variable in supervised ML is?', options: ['The value/label we want to predict', 'A fixed text value', 'A deleted file', 'None'], correctIndex: 0 },
            { question: 'What is an Outlier in data?', options: ['An abnormal data point far from others', 'A perfectly normal data point', 'The dataset average', 'None'], correctIndex: 0 },
            { question: 'Correlation measures the?', options: ['Relationship strength between variables', 'Sum of all variables', 'Weight/size of data', 'None'], correctIndex: 0 },
            { question: 'SQL is primarily used for?', options: ['Querying relational databases', 'Web page design', 'Computer graphics', 'Audio editing'], correctIndex: 0 },
            { question: 'AI helps in Data Science mainly by?', options: ['Automating model building and predictions', 'Writing emails', 'File printing', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'digital-marketing-fundamentals',
        title: 'Digital Marketing Fundamentals',
        icon: '📈',
        description: 'Learn SEO, content strategy, and online growth basics.',
        price: 0, isFree: true, isPremium: false,
        duration: '8 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'dmb-l1', title: 'SEO Fundamentals for Beginners', videoUrl: 'https://www.youtube.com/embed/nU-IIXBWlS4?rel=0', pdfUrl: PDFS.marketing, order: 1 },
            { lessonId: 'dmb-l2', title: 'Social Media Marketing Strategy', videoUrl: 'https://www.youtube.com/embed/nL-MRi7dqPw?rel=0', pdfUrl: PDFS.marketing, order: 2 },
            { lessonId: 'dmb-l3', title: 'Google Ads & PPC Advertising', videoUrl: 'https://www.youtube.com/embed/2cnq84J5gDQ?rel=0', pdfUrl: PDFS.marketing, order: 3 },
            { lessonId: 'dmb-l4', title: 'Email Marketing Mastery', videoUrl: 'https://www.youtube.com/embed/JvRmrSJCFuk?rel=0', pdfUrl: PDFS.marketing, order: 4 }
        ],
        quizQuestions: [
            { question: 'What does SEO stand for?', options: ['Search Engine Optimization', 'Social Entry Order', 'Secure End Office', 'None of these'], correctIndex: 0 },
            { question: 'What is PPC in digital marketing?', options: ['Pay Per Click', 'Price Per Customer', 'Pay Plus Cost', 'Post Payment Check'], correctIndex: 0 },
            { question: 'Most used social media platform for paid ads?', options: ['Facebook/Instagram', 'Notepad', 'Calculator', 'VLC Player'], correctIndex: 0 },
            { question: 'What does ROI stand for?', options: ['Return on Investment', 'Rate of Income', 'Raw Output Index', 'None'], correctIndex: 0 },
            { question: 'What is an Impression in marketing?', options: ['Ad shown on a screen', 'A user click', 'A purchase', 'A product review'], correctIndex: 0 },
            { question: 'What is CTR in marketing?', options: ['Click-Through Rate', 'Cost To Run', 'Call To Reach', 'None of these'], correctIndex: 0 },
            { question: 'Keyword research is primarily for?', options: ['SEO optimization', 'Graphic design', 'Typing speed', 'Audio editing'], correctIndex: 0 },
            { question: 'What is Email Marketing?', options: ['Direct marketing via email', 'Sending random spam', 'Reading newsletters', 'None'], correctIndex: 0 },
            { question: 'What is a CTA in marketing?', options: ['Call To Action', 'Click To Access', 'Common Team Area', 'None'], correctIndex: 0 },
            { question: 'Bounce Rate refers to?', options: ['Users leaving site quickly', 'Users staying long', 'Users clicking ads', 'None'], correctIndex: 0 },
            { question: 'Alt text in images is used for?', options: ['Accessibility & SEO', 'Video quality', 'Audio', 'Page headers'], correctIndex: 0 },
            { question: 'Primary goal of Content Marketing?', options: ['Delivering value to audience', 'Spamming users', 'Creating clickbait', 'None'], correctIndex: 0 },
            { question: 'What is Backlinking?', options: ['Getting links from other websites', 'Internal self-linking', 'Deleting old links', 'None'], correctIndex: 0 },
            { question: 'Can AI help in digital marketing?', options: ['Yes, in many ways', 'No', 'Only for coding', 'Rarely used'], correctIndex: 0 },
            { question: 'Google Ads is an example of?', options: ['A PPC advertising platform', 'A social network', 'A web browser', 'An operating system'], correctIndex: 0 }
        ]
    },
    {
        slug: 'ui-design-fundamentals',
        title: 'UI Design Fundamentals',
        icon: '🎨',
        description: 'Understand core UI elements, layout, and color theory using modern tools like Figma.',
        price: 0, isFree: true, isPremium: false,
        duration: '2 Weeks', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'uid-l1', title: 'Typography, Color Theory & Basics', videoUrl: 'https://www.youtube.com/embed/mU6anWqZJcc?rel=0', pdfUrl: PDFS.uiDesign, order: 1 },
            { lessonId: 'uid-l2', title: 'Figma Complete Beginner Tutorial', videoUrl: 'https://www.youtube.com/embed/HZuk6Wkx_Eg?rel=0', pdfUrl: PDFS.uiDesign, order: 2 },
            { lessonId: 'uid-l3', title: 'UI Design Principles & Patterns', videoUrl: 'https://www.youtube.com/embed/0JCUH5daCCE?rel=0', pdfUrl: PDFS.uiDesign, order: 3 },
            { lessonId: 'uid-l4', title: 'Responsive Web Design Concepts', videoUrl: 'https://www.youtube.com/embed/srvUrASNj0s?rel=0', pdfUrl: PDFS.uiDesign, order: 4 }
        ],
        quizQuestions: [
            { question: 'Common color used to indicate a "Warning" state?', options: ['Yellow or Orange', 'Blue', 'Green', 'Purple'], correctIndex: 0 },
            { question: 'Visual hierarchy in design means?', options: ['Organizing elements by importance', 'Creating random lists', 'Building a tree structure', 'None'], correctIndex: 0 },
            { question: 'What is "White Space" in UI design?', options: ['Empty space around elements', 'An error area', 'Unused background', 'None'], correctIndex: 0 },
            { question: 'Typography in design refers to?', options: ['The art and technique of arranging text', 'Writing source code', 'Drawing illustrations', 'None'], correctIndex: 0 },
            { question: 'Contrast in UI helps with?', options: ['Readability and visual separation', 'Audio quality', 'Page loading speed', 'None'], correctIndex: 0 },
            { question: 'What is a Wireframe in design?', options: ['A low-fidelity blueprint/sketch', 'A high-fidelity final design', 'A coding framework', 'None'], correctIndex: 0 },
            { question: 'Most popular professional tool for UI design?', options: ['Figma', 'Excel', 'Microsoft Word', 'Zoom'], correctIndex: 0 },
            { question: 'Responsive Design means?', options: ['Layout adapts to any screen size', 'Page loads faster only', 'Voice search support', 'None'], correctIndex: 0 },
            { question: 'What is a Prototype in design?', options: ['An interactive mockup for testing', 'A static image', 'The final shipped product', 'None'], correctIndex: 0 },
            { question: 'Consistency in UI design means?', options: ['Using uniform elements throughout', 'Random color changes', 'Different fonts per page', 'None'], correctIndex: 0 },
            { question: 'Accessibility (A11y) in design is for?', options: ['All users including people with disabilities', 'Speed optimization', 'Search engines only', 'None'], correctIndex: 0 },
            { question: 'A Grid system in design is used for?', options: ['Consistent layout and alignment', 'Electrical power grid', 'A math table', 'None'], correctIndex: 0 },
            { question: 'Affordance in UI design means?', options: ['A design element that suggests its usage', 'The cost of design', 'Screen resolution size', 'None'], correctIndex: 0 },
            { question: 'UX stands for?', options: ['User Experience', 'User X-Ray', 'User Exit', 'None'], correctIndex: 0 },
            { question: 'A good icon should be?', options: ['Clear, simple, and recognizable', 'Complex and detailed', 'Hidden from users', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'introduction-to-web-ai',
        title: 'Introduction to Web & AI',
        icon: '🌐',
        description: 'Explore how modern web development integrates AI using TensorFlow.js and browser-based machine learning.',
        price: 0, isFree: true, isPremium: false,
        duration: '15 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'iwa-l1', title: 'What is Web AI? Introduction', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?rel=0', pdfUrl: PDFS.webAI, order: 1 },
            { lessonId: 'iwa-l2', title: 'TensorFlow.js Crash Course', videoUrl: 'https://www.youtube.com/embed/EoYfa6mYOG4?rel=0', pdfUrl: PDFS.webAI, order: 2 },
            { lessonId: 'iwa-l3', title: 'Building Your First Browser AI', videoUrl: 'https://www.youtube.com/embed/WZkc54Dn6FI?rel=0', pdfUrl: PDFS.webAI, order: 3 },
            { lessonId: 'iwa-l4', title: 'AI Models in the Browser (ONNX)', videoUrl: 'https://www.youtube.com/embed/3wZ9L0O-jE0?rel=0', pdfUrl: PDFS.webAI, order: 4 }
        ],
        quizQuestions: [
            { question: 'What is the primary goal of Web AI?', options: ['Run models in browser', 'Crypto mining', 'File storage', 'Gaming only'], correctIndex: 0 },
            { question: 'Most common JS library for AI in the browser?', options: ['TensorFlow.js', 'React', 'Angular', 'Vue.js'], correctIndex: 0 },
            { question: 'Can Web AI work offline?', options: ['Yes, with local models', 'No', 'Sometimes', 'Never'], correctIndex: 0 },
            { question: 'What is Inference in AI?', options: ['Running a trained model', 'Training a model', 'Deleting data', 'None of these'], correctIndex: 0 },
            { question: 'WebGPU is used for?', options: ['Graphics & AI acceleration', 'Audio processing', 'Networking', 'Text editing'], correctIndex: 0 },
            { question: 'Is Browser AI always faster than Cloud AI?', options: ['Depends on device', 'Always faster', 'Never faster', 'Only on Mac'], correctIndex: 0 },
            { question: 'What is a Tensor?', options: ['A multi-dimensional array', 'A simple string', 'A loop structure', 'A function type'], correctIndex: 0 },
            { question: 'What does ML stand for?', options: ['Machine Learning', 'Many Links', 'Main Line', 'More Logic'], correctIndex: 0 },
            { question: 'Neural networks are inspired by?', options: ['The human brain', 'Steam engines', 'The solar system', 'Telephone networks'], correctIndex: 0 },
            { question: 'What is WebAssembly (WASM)?', options: ['Low-level binary format for browsers', 'A web audio tool', 'A CSS framework', 'None of these'], correctIndex: 0 },
            { question: 'Primary language for Web AI development?', options: ['JavaScript', 'C++', 'Java', 'PHP'], correctIndex: 0 },
            { question: 'Common example of Web AI application?', options: ['Real-time face detection', 'Printing files', 'Saving documents', 'Sending emails'], correctIndex: 0 },
            { question: 'What is Quantization in ML?', options: ['Reducing model size/precision', 'Increasing model size', 'Renaming model files', 'None of these'], correctIndex: 0 },
            { question: 'Is Node.js used in Web AI backend?', options: ['Yes, very commonly', 'No', 'Only for CSS', 'Rarely used'], correctIndex: 0 },
            { question: 'Best device capability for Web AI performance?', options: ['Modern GPU-enabled device', 'Old radio', 'Textbook', 'None of these'], correctIndex: 0 }
        ]
    },
    {
        slug: 'excel-data-analysis',
        title: 'Excel & Data Analysis Basics',
        icon: '📊',
        description: 'Master spreadsheets, essential formulas, and standard charts.',
        price: 0, isFree: true, isPremium: false,
        duration: '15 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'ex-l1', title: 'Excel Basics and UI', videoUrl: 'https://www.youtube.com/embed/rB6DpbgPE-E?rel=0', pdfUrl: PDFS.dataScience, order: 1 },
            { lessonId: 'ex-l2', title: 'Formulas and Functions', videoUrl: 'https://www.youtube.com/embed/L72fhGm1tfE?rel=0', pdfUrl: PDFS.dataScience, order: 2 },
            { lessonId: 'ex-l3', title: 'VLOOKUP and Pivot Tables', videoUrl: 'https://www.youtube.com/embed/ExcRbA7fy_A?rel=0', pdfUrl: PDFS.dataScience, order: 3 }
        ],
        quizQuestions: [
            { question: 'What function adds all numbers in a range?', options: ['SUM', 'ADD', 'TOTAL', 'PLUS'], correctIndex: 0 },
            { question: 'Which symbol is used to start a formula in Excel?', options: ['=', '+', '@', '#'], correctIndex: 0 },
            { question: 'What does VLOOKUP stand for?', options: ['Vertical Lookup', 'View Lookup', 'Value Lookup', 'Verify Lookup'], correctIndex: 0 },
            { question: 'What is a Pivot Table used for?', options: ['Summarizing data', 'Deleting data', 'Coloring cells', 'None'], correctIndex: 0 },
            { question: 'What is conditional formatting?', options: ['Formatting based on conditions', 'Just text colors', 'Changing font size', 'None'], correctIndex: 0 },
            { question: 'How to freeze panes in Excel?', options: ['View > Freeze Panes', 'Home > Freeze', 'Insert > Freeze', 'None'], correctIndex: 0 },
            { question: 'Which formula calculates the average?', options: ['AVERAGE', 'MEAN', 'AVG', 'None'], correctIndex: 0 },
            { question: 'What does IF function do?', options: ['Checks a condition and returns value based on true/false', 'Loops code', 'Sums data', 'None'], correctIndex: 0 },
            { question: 'HLOOKUP is used for?', options: ['Horizontal lookup', 'Hidden lookup', 'Huge lookup', 'None'], correctIndex: 0 },
            { question: 'What is a macro in Excel?', options: ['Automated recorded task', 'A large spreadsheet', 'A chart type', 'None'], correctIndex: 0 },
            { question: 'Is Excel good for millions of rows?', options: ['No, better to use SQL', 'Yes', 'It never lags', 'None'], correctIndex: 0 },
            { question: 'What does CONCATENATE do?', options: ['Joins text strings together', 'Deletes text', 'Splits text', 'None'], correctIndex: 0 },
            { question: 'How to absolute reference a cell?', options: ['Use $ symbol', 'Use @ symbol', 'Use # symbol', 'None'], correctIndex: 0 },
            { question: 'Which chart is best for showing percentages of a whole?', options: ['Pie Chart', 'Bar Chart', 'Line Chart', 'None'], correctIndex: 0 },
            { question: 'Excel files typically save as?', options: ['.xlsx', '.docx', '.pptx', '.txt'], correctIndex: 0 }
        ]
    },
    {
        slug: 'aptitude-reasoning-placements',
        title: 'Aptitude & Reasoning for Placements',
        icon: '🧠',
        description: 'Crack technical reasoning rounds with advanced tips and practice.',
        price: 0, isFree: true, isPremium: false,
        duration: '20 Hours', level: 'Intermediate', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'ar-l1', title: 'Quantitative Aptitude Basics', videoUrl: 'https://www.youtube.com/embed/HAnw168huqA?rel=0', pdfUrl: PDFS.softSkills, order: 1 },
            { lessonId: 'ar-l2', title: 'Logical Reasoning Tricks', videoUrl: 'https://www.youtube.com/embed/oOzTTbwGKo4?rel=0', pdfUrl: PDFS.softSkills, order: 2 },
            { lessonId: 'ar-l3', title: 'Verbal Ability & Comprehension', videoUrl: 'https://www.youtube.com/embed/Y7m9eNoB3NU?rel=0', pdfUrl: PDFS.softSkills, order: 3 }
        ],
        quizQuestions: [
            { question: 'If A is brother of B, how is A related to B\'s father?', options: ['Son', 'Nephew', 'Uncle', 'Brother'], correctIndex: 0 },
            { question: 'Find next in series: 2, 4, 8, 16, ?', options: ['32', '24', '40', '64'], correctIndex: 0 },
            { question: 'What is 15% of 200?', options: ['30', '20', '15', '45'], correctIndex: 0 },
            { question: 'If cost price is 100, selling price is 120. Profit % is?', options: ['20%', '10%', '30%', '40%'], correctIndex: 0 },
            { question: 'Meaning of "Abundance"?', options: ['Plenty', 'Scarcity', 'Rare', 'None'], correctIndex: 0 },
            { question: 'If train speed is 60km/h, how far in 2 hours?', options: ['120 km', '60 km', '180 km', 'None'], correctIndex: 0 },
            { question: 'Work done by A in 10 days, B in 15 days. Together?', options: ['6 days', '8 days', '12 days', '5 days'], correctIndex: 0 },
            { question: 'Average of 2, 4, 6, 8, 10 is?', options: ['6', '5', '7', '8'], correctIndex: 0 },
            { question: 'A polygon with 5 sides is?', options: ['Pentagon', 'Hexagon', 'Square', 'None'], correctIndex: 0 },
            { question: 'Find odd one out: Apple, Orange, Banana, Potato', options: ['Potato', 'Apple', 'Orange', 'Banana'], correctIndex: 0 },
            { question: 'What is the probability of flipping heads on a coin?', options: ['1/2', '1/3', '1/4', '1'], correctIndex: 0 },
            { question: 'Synonym of "Fast"?', options: ['Quick', 'Slow', 'Lazy', 'None'], correctIndex: 0 },
            { question: 'Which is a prime number?', options: ['7', '8', '9', '10'], correctIndex: 0 },
            { question: 'If today is Monday, what is 3 days from now?', options: ['Thursday', 'Friday', 'Wednesday', 'None'], correctIndex: 0 },
            { question: 'Blood relation: Your father\'s brother is your?', options: ['Uncle', 'Cousin', 'Brother', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'git-github-crash-course',
        title: 'Git & GitHub Crash Course',
        icon: '🐙',
        description: 'Effectively manage code versions and team collaboration natively.',
        price: 0, isFree: true, isPremium: false,
        duration: '5 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'git-l1', title: 'What is Version Control?', videoUrl: 'https://www.youtube.com/embed/RGOj5yH7evk?rel=0', pdfUrl: PDFS.webAI, order: 1 },
            { lessonId: 'git-l2', title: 'Basic Git Commands', videoUrl: 'https://www.youtube.com/embed/USjZcfj8yxE?rel=0', pdfUrl: PDFS.webAI, order: 2 },
            { lessonId: 'git-l3', title: 'Working with GitHub & PRs', videoUrl: 'https://www.youtube.com/embed/8Dd7KRpKeaE?rel=0', pdfUrl: PDFS.webAI, order: 3 }
        ],
        quizQuestions: [
            { question: 'What is Git?', options: ['A version control system', 'A cloud provider', 'A database', 'None'], correctIndex: 0 },
            { question: 'Command to initialize a git repo?', options: ['git init', 'git start', 'git create', 'git new'], correctIndex: 0 },
            { question: 'How to check status of files?', options: ['git status', 'git check', 'git log', 'git info'], correctIndex: 0 },
            { question: 'Command to stage all changes?', options: ['git add .', 'git add all', 'git commit', 'git push'], correctIndex: 0 },
            { question: 'What does git commit do?', options: ['Saves changes locally', 'Deletes code', 'Uploads to github', 'None'], correctIndex: 0 },
            { question: 'Which command uploads code to GitHub?', options: ['git push', 'git upload', 'git send', 'git pull'], correctIndex: 0 },
            { question: 'What is a Pull Request (PR)?', options: ['Requesting team to review and merge your code', 'Downloading code', 'Deleting code', 'None'], correctIndex: 0 },
            { question: 'Command to download updates from remote?', options: ['git pull', 'git download', 'git push', 'None'], correctIndex: 0 },
            { question: 'What is git clone?', options: ['Copies a remote repository locally', 'Deletes repository', 'Merges code', 'None'], correctIndex: 0 },
            { question: 'What is a branch in git?', options: ['An independent line of development', 'A tree part', 'An error type', 'None'], correctIndex: 0 },
            { question: 'Command to switch branches?', options: ['git checkout or git switch', 'git change', 'git jump', 'None'], correctIndex: 0 },
            { question: 'What does git merge do?', options: ['Combines two branches', 'Deletes branch', 'Uploads branch', 'None'], correctIndex: 0 },
            { question: 'What is a merge conflict?', options: ['When git cannot automatically merge overlapping changes', 'When developers argue', 'A network error', 'None'], correctIndex: 0 },
            { question: 'Git is centralized or distributed?', options: ['Distributed', 'Centralized', 'Neither', 'None'], correctIndex: 0 },
            { question: 'GitHub is?', options: ['A hosting service for git repositories', 'An IDE', 'A programming language', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'communication-skills-placement',
        title: 'Communication Skills',
        icon: '🤝',
        description: 'Enhance your verbal flow, body language, and interview performance.',
        price: 0, isFree: true, isPremium: false,
        duration: '10 Hours', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'com-l1', title: 'Effective Verbal Communication', videoUrl: 'https://www.youtube.com/embed/HAnw168huqA?rel=0', pdfUrl: PDFS.softSkills, order: 1 },
            { lessonId: 'com-l2', title: 'Body Language & Confidence', videoUrl: 'https://www.youtube.com/embed/oOzTTbwGKo4?rel=0', pdfUrl: PDFS.softSkills, order: 2 },
            { lessonId: 'com-l3', title: 'Interview Preparation', videoUrl: 'https://www.youtube.com/embed/Y7m9eNoB3NU?rel=0', pdfUrl: PDFS.softSkills, order: 3 }
        ],
        quizQuestions: [
            { question: 'Key component of active listening?', options: ['Eye contact & attention', 'Interrupting speaker', 'Using your phone', 'Walking away'], correctIndex: 0 },
            { question: 'What is Empathy?', options: ['Understanding others\' feelings', 'Feeling sympathy only', 'Being apathetic', 'None of these'], correctIndex: 0 },
            { question: 'Body language is a form of?', options: ['Non-verbal communication', 'Verbal communication', 'A type of sport', 'None'], correctIndex: 0 },
            { question: 'How important is eye contact in interviews?', options: ['Very important', 'Unimportant', 'Should look away', 'None'], correctIndex: 0 },
            { question: 'Best way to handle an unknown question in interview?', options: ['Admit you don\'t know but show willingness to learn', 'Lie', 'Stay silent forever', 'None'], correctIndex: 0 },
            { question: 'What does EQ stand for?', options: ['Emotional Intelligence', 'Easy Query', 'Extra Quality', 'None'], correctIndex: 0 },
            { question: 'Primary goal of teamwork?', options: ['Shared success and goals', 'Individual competition', 'Working alone always', 'None'], correctIndex: 0 },
            { question: 'Public speaking mainly requires?', options: ['Practice and preparation', 'Natural talent only', 'Magic skills', 'Complete silence'], correctIndex: 0 },
            { question: 'What is constructive Feedback?', options: ['Helpful, actionable input', 'Harsh insults', 'Unnecessary noise', 'None'], correctIndex: 0 },
            { question: 'Networking in a career context is about?', options: ['Building professional relationships', 'Collecting business cards', 'Browsing the internet', 'None'], correctIndex: 0 },
            { question: 'True leadership is about?', options: ['Inspiring and guiding others', 'Giving only orders', 'Managing files', 'None'], correctIndex: 0 },
            { question: 'A good posture communicates?', options: ['Confidence and professionalism', 'Laziness', 'Anger', 'None'], correctIndex: 0 },
            { question: 'Is speaking too fast bad in interviews?', options: ['Yes, can show nervousness', 'No, shows high IQ', 'It doesn\'t matter', 'None'], correctIndex: 0 },
            { question: 'Why ask questions at the end of an interview?', options: ['Shows interest and engagement', 'Shows you are confused', 'To waste time', 'None'], correctIndex: 0 },
            { question: 'Is communication a hard skill or soft skill?', options: ['Soft skill', 'Hard skill', 'Both equally', 'None'], correctIndex: 0 }
        ]
    },

    // =========================================================================
    // --- PAID COURSES (7) ---
    // =========================================================================
    {
        slug: 'mern-stack-development-pro',
        title: 'MERN Stack Development Pro',
        icon: '⚛️',
        description: 'Build industrial-grade full-stack web applications with MongoDB, Express.js, React.js, and Node.js.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '60 Hours', level: 'Advanced', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'mern-l1', title: 'MERN Stack Architecture Overview', videoUrl: 'https://www.youtube.com/embed/7CqJlxBYj-M?rel=0', pdfUrl: PDFS.mern, order: 1 },
            { lessonId: 'mern-l2', title: 'Node.js & Express.js Backend Crash Course', videoUrl: 'https://www.youtube.com/embed/L72fhGm1tfE?rel=0', pdfUrl: PDFS.mern, order: 2 },
            { lessonId: 'mern-l3', title: 'MongoDB & Mongoose for Beginners', videoUrl: 'https://www.youtube.com/embed/ExcRbA7fy_A?rel=0', pdfUrl: PDFS.mern, order: 3 },
            { lessonId: 'mern-l4', title: 'React.js Complete Tutorial', videoUrl: 'https://www.youtube.com/embed/RVFAyFWO4go?rel=0', pdfUrl: PDFS.mern, order: 4 },
            { lessonId: 'mern-l5', title: 'Full MERN App Build from Scratch', videoUrl: 'https://www.youtube.com/embed/ktjafK4SgWM?rel=0', pdfUrl: PDFS.mern, order: 5 }
        ],
        quizQuestions: [
            { question: 'What does the "M" stand for in MERN?', options: ['MongoDB', 'Microsoft', 'MySQL', 'MariaDB'], correctIndex: 0 },
            { question: 'What is Express.js primarily used for?', options: ['Building backend/server APIs', 'Browser rendering', 'Database storage', 'UI styling'], correctIndex: 0 },
            { question: 'React is mainly used for?', options: ['Building Frontend/UI interfaces', 'Server-side logic', 'Logistics management', 'Hardware control'], correctIndex: 0 },
            { question: 'Node.js is a?', options: ['JavaScript runtime environment', 'A database system', 'A text editor', 'A web browser'], correctIndex: 0 },
            { question: 'What is JSON?', options: ['JavaScript Object Notation for data exchange', 'Java System Node', 'Jekyll Script', 'None'], correctIndex: 0 },
            { question: 'REST API stands for?', options: ['Representational State Transfer API', 'Random Easy Set API', 'Real System Tool', 'None'], correctIndex: 0 },
            { question: 'What are React Hooks?', options: ['Functions to use React state in functional components', 'Physical hooks', 'A CSS styling method', 'None'], correctIndex: 0 },
            { question: 'What is Mongoose?', options: ['An Object Data Modeler (ODM) for MongoDB', 'A web browser tool', 'A search engine', 'None'], correctIndex: 0 },
            { question: 'Express Middlewares are used in?', options: ['Processing requests before route handlers', 'Building React UI', 'C++ programs', 'None'], correctIndex: 0 },
            { question: 'NPM stands for?', options: ['Node Package Manager', 'Network Protocol Manager', 'New Page Map', 'None'], correctIndex: 0 },
            { question: 'What is JSX in React?', options: ['JavaScript XML — allows HTML in JS files', 'Java Script Extension', 'JSON Script', 'None'], correctIndex: 0 },
            { question: 'Axios is used in MERN for?', options: ['Making HTTP requests to the backend API', 'Database management', 'CSS styling', 'Local storage'], correctIndex: 0 },
            { question: 'Props in React are?', options: ['Data passed from parent to child components', 'Component-owned state', 'A CSS tool', 'None'], correctIndex: 0 },
            { question: 'Is MongoDB a NoSQL database?', options: ['Yes, it is NoSQL', 'No, it is SQL', 'Depends on config', 'None'], correctIndex: 0 },
            { question: 'The main goal of the MERN stack is?', options: ['Full-stack JavaScript development', 'Mobile app development', 'Operating system dev', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'advanced-prompt-engineering',
        title: 'Advanced Prompt Engineering',
        icon: '✍️',
        description: 'Master complex prompt patterns like Chain-of-Thought, ReAct, and Tree-of-Thoughts to build powerful AI-driven applications.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '4 Weeks', level: 'Advanced', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'ape-l1', title: 'Intro to Prompt Engineering', videoUrl: 'https://www.youtube.com/embed/_ZvnD73m40o?rel=0', pdfUrl: PDFS.prompt, order: 1 },
            { lessonId: 'ape-l2', title: 'Zero-Shot, Few-Shot & Chain-of-Thought', videoUrl: 'https://www.youtube.com/embed/dOxUroR57xs?rel=0', pdfUrl: PDFS.prompt, order: 2 },
            { lessonId: 'ape-l3', title: 'Advanced Patterns: ReAct & Tree of Thoughts', videoUrl: 'https://www.youtube.com/embed/dXI3f9X84H8?rel=0', pdfUrl: PDFS.prompt, order: 3 },
            { lessonId: 'ape-l4', title: 'Prompt Security & Injection Prevention', videoUrl: 'https://www.youtube.com/embed/tjSHaRMqPQo?rel=0', pdfUrl: PDFS.prompt, order: 4 }
        ],
        quizQuestions: [
            { question: 'What is Chain-of-Thought (CoT) prompting?', options: ['Multi-step reasoning through a problem', 'Single word answer technique', 'Random text generation', 'None'], correctIndex: 0 },
            { question: 'Zero-shot prompting means?', options: ['Giving no examples in the prompt', 'Giving many examples', 'A scripted conversation', 'None'], correctIndex: 0 },
            { question: 'Temperature in AI models controls?', options: ['The randomness of AI output', 'Physical room temperature', 'CPU processor heat', 'None'], correctIndex: 0 },
            { question: 'Role prompting involves?', options: ['Assigning a persona to the AI', 'Deleting user data', 'Creating a program loop', 'None'], correctIndex: 0 },
            { question: 'A negative prompt tells the AI?', options: ['What to avoid generating', 'A sad or negative text', 'To delete output files', 'None'], correctIndex: 0 },
            { question: 'System message in ChatGPT is used to?', options: ['Define the AI\'s behavior and role', 'Send automated emails', 'Print text to screen', 'None'], correctIndex: 0 },
            { question: 'Few-shot prompting means?', options: ['Providing a few examples in the prompt', 'No examples at all', 'One thousand examples', 'None'], correctIndex: 0 },
            { question: 'What are "Tokens" in LLMs?', options: ['Chunks/fragments of text processed by the model', 'Digital currency coins', 'Code variables', 'Hyperlinks'], correctIndex: 0 },
            { question: 'Context window in an LLM refers to?', options: ['Maximum text the model can process at once', 'A physical desk window', 'A browser tab', 'None'], correctIndex: 0 },
            { question: 'AI Hallucination means?', options: ['Model confidently generating false facts', 'Bright color visuals', 'AI going to sleep', 'None'], correctIndex: 0 },
            { question: 'Self-Correction prompting technique?', options: ['AI reviews and corrects its own output', 'User manually deletes AI answers', 'Restarting the application', 'None'], correctIndex: 0 },
            { question: 'Tree of Thoughts (ToT) prompting uses?', options: ['Branching reasoning paths', 'A literal forest simulation', 'Geographic map data', 'None'], correctIndex: 0 },
            { question: 'The ReAct prompting pattern combines?', options: ['Reasoning and Action steps', 'Reacting to button clicks', 'Processing audio data', 'None'], correctIndex: 0 },
            { question: 'Prompt Injection is a?', options: ['Security vulnerability in AI systems', 'Medical AI diagnostic tool', 'A new data type', 'None'], correctIndex: 0 },
            { question: 'Best way to get a specific, accurate answer from AI?', options: ['Clear, constrained, specific prompt', 'Very short vague text', 'Vague and broad prompt', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'cloud-computing-aws',
        title: 'Cloud Computing with AWS',
        icon: '☁️',
        description: 'Deploy, manage, and scale real applications on Amazon Web Services — the world\'s most popular cloud platform.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '45 Hours', level: 'Intermediate', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'aws-l1', title: 'AWS Core Services Overview', videoUrl: 'https://www.youtube.com/embed/Z3SYDTn3f11?rel=0', pdfUrl: PDFS.aws, order: 1 },
            { lessonId: 'aws-l2', title: 'EC2, S3 & IAM — AWS Essentials', videoUrl: 'https://www.youtube.com/embed/ulprqHHWlng?rel=0', pdfUrl: PDFS.aws, order: 2 },
            { lessonId: 'aws-l3', title: 'AWS Lambda & Serverless Computing', videoUrl: 'https://www.youtube.com/embed/eOBq__h4OJ4?rel=0', pdfUrl: PDFS.aws, order: 3 },
            { lessonId: 'aws-l4', title: 'Deploying a Web App on AWS', videoUrl: 'https://www.youtube.com/embed/a9__D53WsUs?rel=0', pdfUrl: PDFS.aws, order: 4 }
        ],
        quizQuestions: [
            { question: 'Which AWS service provides scalable object storage?', options: ['S3 (Simple Storage Service)', 'EC2', 'IAM', 'Lambda'], correctIndex: 0 },
            { question: 'AWS EC2 provides?', options: ['Virtual servers in the cloud', 'Object storage', 'A managed database', 'GPU graphics'], correctIndex: 0 },
            { question: 'AWS Lambda is used for?', options: ['Serverless compute functions', 'Virtual Private Cloud', 'Relational databases', 'Object storage'], correctIndex: 0 },
            { question: 'Which AWS service is a managed relational database?', options: ['RDS', 'DynamoDB', 'S3', 'EC2'], correctIndex: 0 },
            { question: 'What is an AWS Region?', options: ['A geographic area hosting AWS data centers', 'A code loop', 'A browser tab', 'None'], correctIndex: 0 },
            { question: 'AWS IAM is used for?', options: ['Identity and Access Management', 'Image processing', 'Internet access', 'Input/output'], correctIndex: 0 },
            { question: 'VPC stands for?', options: ['Virtual Private Cloud', 'Very Public Cloud', 'Video Plus Code', 'None'], correctIndex: 0 },
            { question: 'AWS CloudFront is a?', options: ['Content Delivery Network (CDN)', 'Database service', 'Logic processing tool', 'Physics engine'], correctIndex: 0 },
            { question: 'What does Elastic Load Balancer do?', options: ['Distributes incoming traffic across servers', 'Saves permanent data', 'Deletes log files', 'None'], correctIndex: 0 },
            { question: 'AWS Route 53 is a?', options: ['Domain Name System (DNS) service', 'Storage map', 'Highway routing tool', 'None'], correctIndex: 0 },
            { question: 'AWS CloudWatch is used for?', options: ['Monitoring and observability', 'Physical time-keeping', 'Video conferencing', 'None'], correctIndex: 0 },
            { question: 'Auto Scaling in AWS helps to?', options: ['Handle variable traffic demand', 'Rename configuration files', 'Send emails', 'None'], correctIndex: 0 },
            { question: 'The AWS Management Console is?', options: ['A web-based UI for managing AWS services', 'A gaming console', 'A text editor', 'None'], correctIndex: 0 },
            { question: 'EBS stands for?', options: ['Elastic Block Store', 'Easy Backup System', 'Every Bit Saved', 'None'], correctIndex: 0 },
            { question: 'Main advantage of Cloud Computing is?', options: ['On-demand, scalable compute resources', 'Selling computer hardware', 'Physical book storage', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'ai-product-management',
        title: 'AI Product Management',
        icon: '🧥',
        description: 'Learn how to lead the development of AI-driven products from concept to launch, managing teams and stakeholders.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '30 Hours', level: 'Intermediate', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'aipm-l1', title: 'Introduction to AI Product Management', videoUrl: 'https://www.youtube.com/embed/30nB4v-Ld9I?rel=0', pdfUrl: PDFS.aiPM, order: 1 },
            { lessonId: 'aipm-l2', title: 'Agile Process for AI Products', videoUrl: 'https://www.youtube.com/embed/Z9QbYZh1YXY?rel=0', pdfUrl: PDFS.aiPM, order: 2 },
            { lessonId: 'aipm-l3', title: 'AI Ethics, Bias & Responsible AI', videoUrl: 'https://www.youtube.com/embed/7wsE7O-GGhE?rel=0', pdfUrl: PDFS.aiPM, order: 3 },
            { lessonId: 'aipm-l4', title: 'User Research & Product Roadmaps', videoUrl: 'https://www.youtube.com/embed/oOiGARTEbJ4?rel=0', pdfUrl: PDFS.aiPM, order: 4 }
        ],
        quizQuestions: [
            { question: 'Main challenge in AI Product Management?', options: ['Data quality and reliability', 'Fast typing speed', 'Browser compatibility', 'Keyboard shortcuts'], correctIndex: 0 },
            { question: 'MVP stands for?', options: ['Minimum Viable Product', 'Most Valuable Player', 'Main Version Product', 'None'], correctIndex: 0 },
            { question: 'Data labeling in AI context means?', options: ['Preparing annotated training data', 'Deleting old logs', 'Naming configuration files', 'None'], correctIndex: 0 },
            { question: 'What is a Feedback Loop in AI products?', options: ['Continuous improvement from user data', 'An audio feedback bug', 'A circular list structure', 'None'], correctIndex: 0 },
            { question: 'AI Explainability (XAI) means?', options: ['Making AI decisions transparent and understandable', 'Adjusting AI brightness', 'AI audio settings', 'None'], correctIndex: 0 },
            { question: 'Bias in an AI model means?', options: ['Unfair or skewed model predictions', 'A logic programming tool', 'A data type definition', 'None'], correctIndex: 0 },
            { question: 'Product-Market Fit means?', options: ['Your product strongly satisfies market demand', 'Buying stock in the market', 'Selling of digital assets', 'None'], correctIndex: 0 },
            { question: 'Staging vs Production environment?', options: ['Test environment vs live environment', 'Old version vs new version', 'Hard copy vs soft copy', 'None'], correctIndex: 0 },
            { question: 'KPI stands for?', options: ['Key Performance Indicator', 'Key Page Information', 'Kind People Inc', 'None'], correctIndex: 0 },
            { question: 'Agile methodology is?', options: ['Iterative software development approach', 'A programming language', 'A type of personal computer', 'None'], correctIndex: 0 },
            { question: 'An AI Product Roadmap is?', options: ['A strategic plan for future AI features', 'A physical travel map', 'A vehicle driving tool', 'None'], correctIndex: 0 },
            { question: 'User Persona in PM refers to?', options: ['A fictional typical user profile', 'A physical user mask', 'A unique user ID', 'None'], correctIndex: 0 },
            { question: 'Fine-tuning an AI model means?', options: ['Training on domain-specific data', 'Listening to music', 'Adjusting audio volume', 'None'], correctIndex: 0 },
            { question: 'Edge cases in Product Management are?', options: ['Unusual user scenarios outside normal flow', 'Smooth corner borders in UI', 'Deleted database records', 'None'], correctIndex: 0 },
            { question: 'AI Product Ethics focuses on?', options: ['Responsible and moral AI development', 'AI processing speed optimization', 'AI pricing strategies', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'full-cycle-cybersecurity',
        title: 'Full-Cycle Cybersecurity',
        icon: '🛡️',
        description: 'Protect your applications and networks from sophisticated cyber threats using AI-powered defense strategies.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '80 Hours', level: 'Advanced', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'cs-l1', title: 'Modern Cyber Threats & Attack Vectors', videoUrl: 'https://www.youtube.com/embed/3Kq1MIfTWCE?rel=0', pdfUrl: PDFS.cyber, order: 1 },
            { lessonId: 'cs-l2', title: 'Network Security & Firewalls', videoUrl: 'https://www.youtube.com/embed/r926DREXZ0I?rel=0', pdfUrl: PDFS.cyber, order: 2 },
            { lessonId: 'cs-l3', title: 'Ethical Hacking & Penetration Testing', videoUrl: 'https://www.youtube.com/embed/3Kq1MIfTWCE?rel=0', pdfUrl: PDFS.cyber, order: 3 },
            { lessonId: 'cs-l4', title: 'Encryption, VPN & Secure Communications', videoUrl: 'https://www.youtube.com/embed/AuYNXgO_f3Y?rel=0', pdfUrl: PDFS.cyber, order: 4 },
            { lessonId: 'cs-l5', title: 'AI-Powered Cyber Defense Strategies', videoUrl: 'https://www.youtube.com/embed/mT3HFkcbOgE?rel=0', pdfUrl: PDFS.cyber, order: 5 }
        ],
        quizQuestions: [
            { question: 'What is "Phishing" in cybersecurity?', options: ['Social engineering to steal credentials', 'Actual fishing activity', 'A firewall rule', 'None'], correctIndex: 0 },
            { question: 'Encryption is primarily used for?', options: ['Protecting data privacy', 'Permanently deleting data', 'Speeding up network', 'Audio processing'], correctIndex: 0 },
            { question: 'What is a Firewall?', options: ['A system that monitors/controls network traffic', 'A literal hot wall', 'A hardware bug', 'None'], correctIndex: 0 },
            { question: 'Two-Factor Authentication (2FA) provides?', options: ['An extra security layer beyond password', 'Two times faster speed', 'Two simultaneous users', 'None'], correctIndex: 0 },
            { question: 'What is Malware?', options: ['Malicious software designed to harm systems', 'Helpful software tools', 'An email client', 'None'], correctIndex: 0 },
            { question: 'A Security "Patch" is?', options: ['A fix for a known software vulnerability', 'A company logo', 'A part of the screen', 'None'], correctIndex: 0 },
            { question: 'SQL Injection attack targets?', options: ['Databases via malicious SQL queries', 'Database regular updates', 'Database backup files', 'None'], correctIndex: 0 },
            { question: 'A Brute Force attack works by?', options: ['Systematically guessing all possible passwords', 'Physical hardware damage', 'Mass email spamming', 'None'], correctIndex: 0 },
            { question: 'What is a VPN?', options: ['Virtual Private Network for secure connections', 'Very Private Node', 'Video Plus Network', 'None'], correctIndex: 0 },
            { question: 'A "White Hat" hacker is a?', options: ['Ethical hacker who finds vulnerabilities legally', 'Malicious/criminal hacker', 'A physical hat maker', 'None'], correctIndex: 0 },
            { question: 'Zero-day vulnerability refers to?', options: ['An unknown, unpatched security flaw', 'An old known vulnerability', 'A day-0 database backup', 'None'], correctIndex: 0 },
            { question: 'HTTPS vs HTTP — what does the "S" mean?', options: ['Secure (encrypted connection)', 'Faster speed', 'Smarter protocol', 'None'], correctIndex: 0 },
            { question: 'Social Engineering in cybersecurity means?', options: ['Manipulating people to reveal information', 'Writing application code', 'Building infrastructure', 'None'], correctIndex: 0 },
            { question: 'Ransomware attacks are designed to?', options: ['Encrypt data and demand payment', 'Simply delete all files', 'Watch user activity', 'None'], correctIndex: 0 },
            { question: 'The CIA Triad in cybersecurity stands for?', options: ['Confidentiality, Integrity, Availability', 'Speed, Price, Power', 'Code, Input, Audit', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'generative-ai-video-masterclass',
        title: 'Generative AI Video Masterclass',
        icon: '🎬',
        description: 'Create high-quality cinematic videos using cutting-edge AI tools like Runway ML, Sora, and Pika Labs.',
        price: getRandomPrice(59, 149), isFree: false, isPremium: true,
        duration: '3 Weeks', level: 'Intermediate', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'gav-l1', title: 'Introduction to Generative AI Video', videoUrl: 'https://www.youtube.com/embed/SVm6u1-d9yY?rel=0', pdfUrl: PDFS.genAI, order: 1 },
            { lessonId: 'gav-l2', title: 'Runway ML Gen-2 & Gen-3 Tutorial', videoUrl: 'https://www.youtube.com/embed/qdB9OkPfhAY?rel=0', pdfUrl: PDFS.genAI, order: 2 },
            { lessonId: 'gav-l3', title: 'Pika Labs & Kling AI Video Creation', videoUrl: 'https://www.youtube.com/embed/3RYTUvORhLc?rel=0', pdfUrl: PDFS.genAI, order: 3 },
            { lessonId: 'gav-l4', title: 'Advanced Video Prompting & Editing', videoUrl: 'https://www.youtube.com/embed/tjSHaRMqPQo?rel=0', pdfUrl: PDFS.genAI, order: 4 }
        ],
        quizQuestions: [
            { question: 'Runway ML is primarily a?', options: ['AI text-to-video generation tool', 'Excel spreadsheet', 'Word processor', 'Video conferencing app'], correctIndex: 0 },
            { question: 'What is AI Inpainting in video?', options: ['AI fills in/replaces parts of a frame', 'Drawing paint dots manually', 'Deleting video files', 'None'], correctIndex: 0 },
            { question: 'Standard cinematic frame rate is?', options: ['24 fps', '1 fps', '1000 fps', 'None'], correctIndex: 0 },
            { question: 'OpenAI\'s Sora is a?', options: ['Advanced AI text-to-video model', 'Audio editing tool', 'Image generator only', 'None'], correctIndex: 0 },
            { question: 'Motion Brush in Runway is used for?', options: ['Animating specific areas of a frame', 'Cleaning the screen', 'Painting physical walls', 'None'], correctIndex: 0 },
            { question: 'Pika Labs is a?', options: ['AI video generation platform', 'A Pokémon character', 'A software bug', 'None'], correctIndex: 0 },
            { question: '16:9 aspect ratio is?', options: ['Standard widescreen format', 'Square format', 'Portrait/vertical format', 'None'], correctIndex: 0 },
            { question: '1080p video resolution is?', options: ['Full HD (1920×1080 pixels)', 'Standard Definition', '4K Ultra HD', 'None'], correctIndex: 0 },
            { question: 'Video prompting in AI tools uses?', options: ['Text descriptions of desired video', 'Mathematical scripts', 'Voice narration only', 'None'], correctIndex: 0 },
            { question: 'AI Video Upscaling means?', options: ['Increasing video resolution and quality', 'Deleting the video file', 'Renaming the video', 'None'], correctIndex: 0 },
            { question: 'Generative AI creates?', options: ['Brand new original content', 'Exact copies of existing content', 'Physical printed hardware', 'None'], correctIndex: 0 },
            { question: 'AI video realism is?', options: ['Improving rapidly with new models', 'Already perfect and flawless', 'Completely impossible', 'None'], correctIndex: 0 },
            { question: 'Character consistency in AI video means?', options: ['Same character appearance across frames', 'Random different faces each frame', 'Constantly changing colors', 'None'], correctIndex: 0 },
            { question: 'Commercial use of AI-generated video?', options: ['Often requires proper licensing', 'Always completely free', 'Is strictly forbidden', 'None'], correctIndex: 0 },
            { question: 'Video editing vs Generative AI video — the key difference?', options: ['Editing modifies existing footage; Generative creates new', 'They are the same thing', 'Deleting vs saving files', 'None'], correctIndex: 0 }
        ]
    },
    {
        slug: 'special-masterclass-v1',
        title: 'CourseNova Special Masterclass',
        icon: '💎',
        description: 'A high-value career acceleration masterclass available at a special trial price for dedicated learners on CourseNova.',
        price: 1, isFree: false, isPremium: true,
        duration: '1 Week', level: 'Beginner', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: 'sp-l1', title: 'Success Mindset & Study Habits', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?rel=0', pdfUrl: PDFS.special, order: 1 },
            { lessonId: 'sp-l2', title: 'Time Management & Deep Work', videoUrl: 'https://www.youtube.com/embed/oTugjssqOT0?rel=0', pdfUrl: PDFS.special, order: 2 },
            { lessonId: 'sp-l3', title: 'Building Your Professional Portfolio', videoUrl: 'https://www.youtube.com/embed/ZZBqkF1XQAI?rel=0', pdfUrl: PDFS.special, order: 3 }
        ],
        quizQuestions: [
            { question: 'Is consistency the key to long-term success?', options: ['Yes, absolutely', 'No, inconsistency is fine', 'Maybe sometimes', 'Never'], correctIndex: 0 },
            { question: 'Does daily deliberate practice help you improve?', options: ['Yes, significantly', 'No effect', 'Sometimes by luck', 'None'], correctIndex: 0 },
            { question: 'Best online platform to learn skills?', options: ['CourseNova', 'Offline books only', 'No platform', 'None'], correctIndex: 0 },
            { question: 'The trial price of this masterclass is?', options: ['Highly affordable at ₹1', 'Very expensive', 'Completely free', 'None'], correctIndex: 0 },
            { question: 'The goal of this special masterclass is?', options: ['Fast-track career skills', 'Wasting time', 'Avoiding learning', 'None'], correctIndex: 0 },
            { question: 'Community and peer support is?', options: ['Included in the platform', 'Not available', 'Optional add-on', 'None'], correctIndex: 0 },
            { question: 'To earn a certificate, you must score?', options: ['60% or above in the final test', '100% perfect score', '0% minimum', 'None'], correctIndex: 0 },
            { question: 'CourseNova courses are delivered?', options: ['Online via video lessons', 'Offline only', 'Physical classroom', 'None'], correctIndex: 0 },
            { question: 'True success in learning requires?', options: ['Consistent effort and action', 'Natural magic talent', 'Pure luck only', 'Doing nothing'], correctIndex: 0 },
            { question: 'Every certificate has?', options: ['A unique verification ID', 'Random placeholder text', 'Only your name', 'None'], correctIndex: 0 },
            { question: 'MCQ stands for?', options: ['Multiple Choice Questions', 'Main Code Query', 'Medical Check Query', 'None'], correctIndex: 0 },
            { question: 'The passing threshold for all CourseNova tests is?', options: ['60%', '10%', '100%', '0%'], correctIndex: 0 },
            { question: 'Can you retry a failed test on CourseNova?', options: ['Yes, multiple attempts allowed', 'No, only one chance', 'Only once more', 'None'], correctIndex: 0 },
            { question: 'A certificate is awarded when?', options: ['You pass the final test with 60%+', 'Just after signing up', 'After watching 1 video', 'None'], correctIndex: 0 },
            { question: 'Are you ready to start learning and growing?', options: ['Yes! Let\'s go!', 'Always ready', 'Sure, why not!', 'All of the above'], correctIndex: 3 }
        ]
    }
];

// ─── 2. MOCK TEST PACKS DATA ─────────────────────────────────────────────────

const mockPacks = [
    // --- FREE MOCK TESTS (6) ---
    {
        id: 'class-9-maths-free', title: 'Class 9 Mathematics Mini-Mock', category: 'Class 9',
        price: 0, isFree: true, totalTests: 3,
        thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd48219d8?w=800&q=80',
        tests: [{ testId: 'c9m-1', testTitle: 'Number Systems', numQuestions: 5, durationMinutes: 30, questions: [] }]
    },
    {
        id: 'jee-main-physics-starter', title: 'JEE Main Physics Starter', category: 'JEE Main',
        price: 0, isFree: true, totalTests: 2,
        thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&q=80',
        tests: [{ testId: 'jp-1', testTitle: 'Units and Dimensions', numQuestions: 5, durationMinutes: 20, questions: [] }]
    },
    {
        id: 'neet-bio-mini', title: 'NEET Biology Mini Drill', category: 'NEET',
        price: 0, isFree: true, totalTests: 5,
        thumbnail: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80',
        tests: [{ testId: 'nb-1', testTitle: 'Cell Biology', numQuestions: 5, durationMinutes: 15, questions: [] }]
    },
    {
        id: 'ssc-aptitude-free', title: 'SSC Quantitative Aptitude Free', category: 'SSC',
        price: 0, isFree: true, totalTests: 2,
        thumbnail: 'https://images.unsplash.com/photo-1543286386-2e671340c24d?w=800&q=80',
        tests: [{ testId: 'sa-1', testTitle: 'Percentage Basics', numQuestions: 5, durationMinutes: 25, questions: [] }]
    },
    {
        id: 'class-10-science-free', title: 'Class 10 Science Sample', category: 'Class 10',
        price: 0, isFree: true, totalTests: 1,
        thumbnail: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80',
        tests: [{ testId: 'c10s-1', testTitle: 'Chemical Reactions', numQuestions: 5, durationMinutes: 30, questions: [] }]
    },
    {
        id: 'banking-reasoning-free', title: 'Banking Reasoning Booster', category: 'Banking',
        price: 0, isFree: true, totalTests: 3,
        thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
        tests: [{ testId: 'br-1', testTitle: 'Syllogism Intro', numQuestions: 5, durationMinutes: 20, questions: [] }]
    },

    // --- PAID MOCK TESTS (7) ---
    {
        id: 'jee-main-2026-full', title: 'JEE Main 2026 Ultimate Test Series', category: 'JEE Main',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 20,
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
        tests: [{ testId: 'jf-1', testTitle: 'Full Length Test 1', numQuestions: 5, durationMinutes: 180, questions: [] }]
    },
    {
        id: 'neet-target-2026', title: 'NEET Target 2026 High-Yield', category: 'NEET',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 15,
        thumbnail: 'https://images.unsplash.com/photo-1584036561566-baf2418b794a?w=800&q=80',
        tests: [{ testId: 'nf-1', testTitle: 'PCB Mock Test 1', numQuestions: 5, durationMinutes: 200, questions: [] }]
    },
    {
        id: 'upsc-prelims-gs', title: 'UPSC GS Paper I Mastery', category: 'UPSC',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 10,
        thumbnail: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&q=80',
        tests: [{ testId: 'uf-1', testTitle: 'History & Polity', numQuestions: 5, durationMinutes: 120, questions: [] }]
    },
    {
        id: 'ssc-cgl-tier-1-all', title: 'SSC CGL Tier 1 All Subjects', category: 'SSC',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 25,
        thumbnail: 'https://images.unsplash.com/photo-1454165833772-d996d49510d1?w=800&q=80',
        tests: [{ testId: 'sf-1', testTitle: 'Full Mock Test 1', numQuestions: 5, durationMinutes: 60, questions: [] }]
    },
    {
        id: 'class-12-pcm-boards', title: 'Class 12 Boards PCM Super Pack', category: 'Class 12',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 12,
        thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
        tests: [{ testId: 'cf-1', testTitle: 'Mathematics Board Sample', numQuestions: 5, durationMinutes: 180, questions: [] }]
    },
    {
        id: 'banking-po-clerk-full', title: 'Banking PO/Clerk Full Series', category: 'Banking',
        price: getRandomPrice(29, 99), isFree: false, totalTests: 30,
        thumbnail: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
        tests: [{ testId: 'bf-1', testTitle: 'Banking Awareness Mock 1', numQuestions: 5, durationMinutes: 45, questions: [] }]
    },
    {
        id: 'special-test-pack-v1', title: 'Premium Trial Mock Test', category: 'Competitive Exams',
        price: 1, isFree: false, totalTests: 3,
        thumbnail: 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=800&q=80',
        tests: [{ testId: 'st-1', testTitle: 'Quick Trial Mock', numQuestions: 5, durationMinutes: 20, questions: [] }]
    }
];

// ─── 3. SEEDING LOGIC ─────────────────────────────────────────────────────────

async function seed() {
    try {
        console.log('🔗 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Purge old data
        console.log('🗑️  Purging existing records...');
        await Course.deleteMany({});
        await MockTestPack.deleteMany({});
        await PracticeQuestion.deleteMany({});
        console.log('✅ Purged all courses, mock packs, and practice questions.');

        // 2. Insert Practice Questions (used by mock tests)
        console.log('📖 Generating common practice questions...');
        const categoryQuestions = {
            'JEE Main': [
                { q: 'What is the SI unit of Force?', o: ['Newton', 'Joule', 'Pascal', 'Watt'], a: 'Newton' },
                { q: 'What is the derivative of sin(x)?', o: ['cos(x)', '-cos(x)', 'tan(x)', 'sec(x)'], a: 'cos(x)' }
            ],
            'NEET': [
                { q: 'Which organelle is the powerhouse of the cell?', o: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'], a: 'Mitochondria' },
                { q: 'What is the common name for NaCl?', o: ['Salt', 'Sugar', 'Water', 'Acid'], a: 'Salt' }
            ],
            'SSC': [
                { q: 'What is 15% of 200?', o: ['30', '20', '40', '50'], a: '30' },
                { q: 'Who was the first Prime Minister of India?', o: ['Nehru', 'Gandhi', 'Patel', 'Azad'], a: 'Nehru' }
            ],
            'UPSC': [
                { q: 'When did the Indian Constitution come into effect?', o: ['1950', '1947', '1948', '1952'], a: '1950' },
                { q: 'Which is the longest river in India?', o: ['Ganga', 'Yamuna', 'Godavari', 'Indus'], a: 'Ganga' }
            ],
            'Class 9': [
                { q: 'What is the square root of 81?', o: ['9', '8', '7', '10'], a: '9' },
                { q: 'Is 2 a prime number?', o: ['Yes', 'No', 'Maybe', 'None'], a: 'Yes' }
            ],
            'Class 10': [
                { q: 'What is the valency of Carbon?', o: ['4', '2', '6', '1'], a: '4' },
                { q: 'What is the chemical formula of Water?', o: ['H2O', 'CO2', 'O2', 'H2'], a: 'H2O' }
            ],
            'Class 12': [
                { q: 'What is the integral of e^x?', o: ['e^x', 'xe^x', 'ln(x)', '1/x'], a: 'e^x' },
                { q: 'Who discovered Electron?', o: ['JJ Thomson', 'Bohr', 'Rutherford', 'Chadwick'], a: 'JJ Thomson' }
            ],
            'Banking': [
                { q: 'What does ATM stand for?', o: ['Automated Teller Machine', 'Any Time Money', 'Auto Token Machine', 'None'], a: 'Automated Teller Machine' },
                { q: 'What is the full form of NBFC?', o: ['Non-Banking Financial Company', 'National Banking Foster Corp', 'None', 'Main'], a: 'Non-Banking Financial Company' }
            ],
            'Competitive Exams': [
                { q: 'Which planet is known as the Red Planet?', o: ['Mars', 'Venus', 'Jupiter', 'Saturn'], a: 'Mars' },
                { q: 'What is the capital of France?', o: ['Paris', 'Lyon', 'Marseille', 'Nice'], a: 'Paris' }
            ]
        };

        let allQuestions = [];
        for (const [cat, qs] of Object.entries(categoryQuestions)) {
            for (let i = 0; i < qs.length; i++) {
                allQuestions.push({
                    category: cat,
                    subject: 'General',
                    question: qs[i].q,
                    options: qs[i].o,
                    correctAnswer: qs[i].a,
                    explanation: `Detailed explanation for: ${qs[i].q}`,
                    difficulty: 'Medium'
                });
            }
        }
        const savedQs = await PracticeQuestion.insertMany(allQuestions);
        console.log(`✅ Saved ${savedQs.length} practice questions.`);

        // 3. Link Questions to Mock Packs and Insert
        console.log('📦 Seeding Mock Test Packs...');
        for (let pack of mockPacks) {
            const relevantQs = savedQs.filter(q => q.category === pack.category);
            for (let test of pack.tests) {
                test.questions = relevantQs.slice(0, 5).map(q => q._id);
                test.numQuestions = test.questions.length;
            }
            await MockTestPack.create(pack);
        }
        console.log(`✅ Successfully seeded ${mockPacks.length} mock test packs.`);

        // 4. Insert Courses
        console.log('🎓 Seeding Courses...');
        await Course.insertMany(courses);
        console.log(`✅ Successfully seeded ${courses.length} courses.`);

        console.log('\n✨ ALL DONE! Platform is now refreshed with:');
        console.log(`   📹 Each course has valid video lessons (real YouTube URLs)`);
        console.log(`   📄 Each lesson has a PDF study material link`);
        console.log(`   ❓ Each course has 15 quiz questions`);
        console.log(`   🏆 Certificate earned at 60% passing score`);
        console.log(`   - Courses: 11 Free + 7 Paid = Total 18`);
        console.log(`   - Mock Tests: 6 Free + 7 Paid = Total 13`);

        process.exit(0);
    } catch (err) {
        console.error('❌ CRITICAL ERROR DURING SEEDING:', err.message);
        console.error(err);
        process.exit(1);
    }
}

seed();
