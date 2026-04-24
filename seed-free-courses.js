/**
 * seed-free-courses.js
 * Seeds 7 free courses into MongoDB.
 * Each course has 3 lessons (Video + PDF) and 10 quiz questions.
 * Run: node seed-free-courses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course   = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const freeCourses = [
  {
    slug: 'ai-prompt-engineering',
    title: 'Introduction to AI & Prompt Engineering',
    icon: '🤖',
    description: 'Learn the fundamentals of Artificial Intelligence and master the art of writing effective prompts for LLMs like ChatGPT and Claude.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    level: 'Beginner',
    assignments: 2,
    highlights: [
      'Understanding LLMs and Generative AI',
      'The anatomy of a perfect prompt',
      'Zero-shot, Few-shot, and Chain-of-Thought prompting',
      'Avoiding AI hallucinations',
      'Practical AI use-cases for productivity'
    ],
    lessons: [
      {
        lessonId: 'ai-l1',
        title: 'What is Generative AI?',
        videoUrl: 'https://www.youtube.com/embed/G2fqAlgmoPo',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'ai-l2',
        title: 'Prompting Fundamentals',
        videoUrl: 'https://www.youtube.com/embed/_ZvnD73m40g',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'ai-l3',
        title: 'Advanced Prompting Techniques',
        videoUrl: 'https://www.youtube.com/embed/jC4v5AS4RIM',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'What does LLM stand for?', options: ['Large Language Model', 'Low Level Machine', 'Linked Logic Module', 'Local Language Map'], correctIndex: 0 },
      { question: 'Which technique involves giving examples in a prompt?', options: ['Zero-shot', 'Few-shot', 'No-shot', 'Multi-shot'], correctIndex: 1 },
      { question: 'What is "Hallucination" in AI?', options: ['AI sleeping', 'AI generating false information', 'AI being very fast', 'AI rejecting prompts'], correctIndex: 1 },
      { question: 'GPT stands for?', options: ['Generative Pre-trained Transformer', 'General Processing Tool', 'Global Path Tracer', 'Grid Point Table'], correctIndex: 0 },
      { question: 'Which is a common AI safety concern?', options: ['Bias', 'Too much logic', 'Fast typing', 'Small files'], correctIndex: 0 },
      { question: 'Chain-of-Thought prompting helps in?', options: ['Complex reasoning', 'Simple math', 'Greeting users', 'Setting timers'], correctIndex: 0 },
      { question: 'Temperature in LLM settings controls?', options: ['CPU heat', 'Randomness of output', 'Speed of response', 'Memory usage'], correctIndex: 1 },
      { question: 'Tokens in AI are?', options: ['Coins', 'Units of text', 'Logical steps', 'Error messages'], correctIndex: 1 },
      { question: 'Which company created ChatGPT?', options: ['Google', 'Microsoft', 'OpenAI', 'Meta'], correctIndex: 2 },
      { question: 'Prompt Engineering is?', options: ['Building computers', 'Designing input text for AI', 'Fixing hardware', 'Writing code'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'web-dev-quickstart',
    title: 'Web Development Quickstart',
    icon: '🌐',
    description: 'A hands-on introduction to building websites. Learn HTML for structure and CSS for beautiful designs.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '3 Weeks',
    level: 'Beginner',
    assignments: 3,
    highlights: [
      'HTML5 Semantic Elements',
      'CSS3 Flexbox and Grid',
      'Responsive Web Design',
      'Box Model and Positioning',
      'Deploying your first website'
    ],
    lessons: [
      {
        lessonId: 'web-l1',
        title: 'HTML Foundations',
        videoUrl: 'https://www.youtube.com/embed/kUMe1FH4CHE',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'web-l2',
        title: 'CSS Styling Basics',
        videoUrl: 'https://www.youtube.com/embed/1Rs2ND1ryYc',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'web-l3',
        title: 'Layouts with Flexbox',
        videoUrl: 'https://www.youtube.com/embed/fYq5PXgSsbE',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'What does HTML stand for?', options: ['High Text Machine Language', 'HyperText Markup Language', 'Hyperlink Text Main Line', 'None of these'], correctIndex: 1 },
      { question: 'Which tag is used for the largest heading?', options: ['<h6>', '<head>', '<heading>', '<h1>'], correctIndex: 3 },
      { question: 'Which tag creates a line break?', options: ['<br>', '<lb>', '<break>', '<hr>'], correctIndex: 0 },
      { question: 'CSS stands for?', options: ['Colorful Style Sheets', 'Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style Sheets'], correctIndex: 2 },
      { question: 'Which property changes background color?', options: ['color', 'bg-color', 'background-color', 'hex-color'], correctIndex: 2 },
      { question: 'What is the correct HTML for a link?', options: ['<a>url</a>', '<a href="url">text</a>', '<link>url</link>', '<a>text:url</a>'], correctIndex: 1 },
      { question: 'How do you make text bold in CSS?', options: ['font-weight: bold', 'text-style: bold', 'font: bold', 'font-size: bold'], correctIndex: 0 },
      { question: 'Flexbox is used for?', options: ['Databases', 'Layouts', 'Images', 'Animations'], correctIndex: 1 },
      { question: 'Which HTML tag is used for bullet points?', options: ['<ol>', '<ul>', '<li>', '<list>'], correctIndex: 1 },
      { question: 'Responsive design means?', options: ['Fast loading', 'Adapting to screen size', 'Reacting to clicks', 'Secure coding'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'python-beginners',
    title: 'Python for Absolute Beginners',
    icon: '🐍',
    description: 'Learn Python, the worlds most popular programming language. Perfect for data science, web dev, and automation.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '4 Weeks',
    level: 'Beginner',
    assignments: 4,
    highlights: [
      'Variables and Data Types',
      'Control Flow (If/Loops)',
      'Functions and Modules',
      'List Comprehensions',
      'Error Handling with Try/Except'
    ],
    lessons: [
      {
        lessonId: 'py-l1',
        title: 'Variables & Types',
        videoUrl: 'https://www.youtube.com/embed/rfscVS0vtbw',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'py-l2',
        title: 'Loops & Conditionals',
        videoUrl: 'https://www.youtube.com/embed/6iF8Xb7Z3wQ',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'py-l3',
        title: 'Functions & Scopes',
        videoUrl: 'https://www.youtube.com/embed/9Os0o3wzS_I',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'Who created Python?', options: ['Guido van Rossum', 'Elon Musk', 'James Gosling', 'Mark Zuckerberg'], correctIndex: 0 },
      { question: 'How do you print in Python?', options: ['echo()', 'console.log()', 'print()', 'system.out.print()'], correctIndex: 2 },
      { question: 'Which is a valid variable name?', options: ['2var', '_my_var', 'my-var', 'my var'], correctIndex: 1 },
      { question: 'Python is an?', options: ['Interpreted language', 'Compiled language', 'Markup language', 'Low level language'], correctIndex: 0 },
      { question: 'Which data type is for whole numbers?', options: ['float', 'int', 'str', 'bool'], correctIndex: 1 },
      { question: 'How do you start a comment in Python?', options: ['//', '/*', '#', '--'], correctIndex: 2 },
      { question: 'Which keyword creates a function?', options: ['func', 'define', 'def', 'void'], correctIndex: 2 },
      { question: 'Indentations in Python are?', options: ['Optional', 'Mandatory', 'Only for style', 'For comments only'], correctIndex: 1 },
      { question: 'Which operator is for power (exponent)?', options: ['^', '*', '**', 'pow'], correctIndex: 2 },
      { question: 'Lists in Python are?', options: ['Immutable', 'Mutable', 'Fixed size', 'Always sorted'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'js-essentials',
    title: 'JavaScript Essentials',
    icon: '⚡',
    description: 'Master the logic behind modern web apps. Learn DOM manipulation, events, and modern ES6+ syntax.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '3 Weeks',
    level: 'Beginner',
    assignments: 3,
    highlights: [
      'ES6+ (Arrow functions, Destructuring)',
      'DOM API Mastery',
      'Event Handling',
      'Asynchronous JS (Promises)',
      'LocalStorage and JSON'
    ],
    lessons: [
      {
        lessonId: 'js-l1',
        title: 'JS Basics & Variables',
        videoUrl: 'https://www.youtube.com/embed/W6NZfCO5SIk',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'js-l2',
        title: 'DOM Manipulation',
        videoUrl: 'https://www.youtube.com/embed/5fb2aPlgoys',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'js-l3',
        title: 'Events & Listeners',
        videoUrl: 'https://www.youtube.com/embed/XF1_MlZ5P48',
        pdfUrl: 'dummy_document.pdf', 
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'Which keyword defines a constant?', options: ['var', 'let', 'const', 'fixed'], correctIndex: 2 },
      { question: 'Correct way to select an ID?', options: ['querySelector("#id")', 'getElementByClass("id")', 'select("id")', 'getId("id")'], correctIndex: 0 },
      { question: 'JavaScript is?', options: ['Static typed', 'Dynamic typed', 'Strongly typed', 'Not a language'], correctIndex: 1 },
      { question: 'Which method adds a listener?', options: ['onEvent()', 'listen()', 'addEventListener()', 'attach()'], correctIndex: 2 },
      { question: 'Array index starts from?', options: ['1', '0', '-1', 'Any'], correctIndex: 1 },
      { question: 'What is === operator?', options: ['Assignment', 'Equality', 'Strict Equality', 'Bitwise'], correctIndex: 2 },
      { question: 'NaN stands for?', options: ['Not a Number', 'New and Nice', 'Null and Null', 'Negative and Null'], correctIndex: 0 },
      { question: 'Arrow function syntax?', options: ['function => {}', '() => {}', 'def => {}', 'go => {}'], correctIndex: 1 },
      { question: 'JSON.stringify() does?', options: ['Parses string', 'Converts obj to string', 'Fetches data', 'Deletes data'], correctIndex: 1 },
      { question: 'JavaScript runs in?', options: ['Only Server', 'Only Browser', 'Both Browser & Server', 'Only Mobile'], correctIndex: 2 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'digital-marketing',
    title: 'Digital Marketing Fundamentals',
    icon: '📢',
    description: 'Grow your business or personal brand. Learn SEO, Social Media Marketing, and Email strategies.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    level: 'Beginner',
    assignments: 2,
    highlights: [
      'Understanding the Marketing Funnel',
      'SEO Basics (On-page/Off-page)',
      'Social Media Strategy',
      'Content Marketing Principles',
      'Email Marketing Automation'
    ],
    lessons: [
      {
        lessonId: 'dm-l1',
        title: 'Introduction to SEO',
        videoUrl: 'https://www.youtube.com/embed/vO_fN6P6WOk',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'dm-l2',
        title: 'Social Media Strategy',
        videoUrl: 'https://www.youtube.com/embed/8-T-R_41fO8',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'dm-l3',
        title: 'The Marketing Funnel',
        videoUrl: 'https://www.youtube.com/embed/qyWdG9p2I00',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'SEO stands for?', options: ['Search Engine Optimization', 'Social Engine Option', 'Secure Electronic Order', 'None'], correctIndex: 0 },
      { question: 'Which is a "Search Engine"?', options: ['Facebook', 'Google', 'WhatsApp', 'Instagram'], correctIndex: 1 },
      { question: 'What is PPC?', options: ['Pay Per Click', 'Point Per Click', 'Price Per Customer', 'Pre Paid Content'], correctIndex: 0 },
      { question: 'A/B testing means?', options: ['Testing two versions', 'Testing alphabet', 'Testing software', 'Testing hardware'], correctIndex: 0 },
      { question: 'Bounce rate refers to?', options: ['Users leaving quickly', 'Users buying', 'Users clicking ads', 'Users sharing links'], correctIndex: 0 },
      { question: 'Keywords are used for?', options: ['Security', 'SEO', 'Styling', 'Storage'], correctIndex: 1 },
      { question: 'B2B marketing means?', options: ['Back to Business', 'Business to Business', 'Buy to Build', 'None'], correctIndex: 1 },
      { question: 'CTR stands for?', options: ['Click Through Rate', 'Cost To Run', 'Call To Review', 'None'], correctIndex: 0 },
      { question: 'Which is "Owned Media"?', options: ['TV Ad', 'Your Website', 'Billboard', 'Viral Post'], correctIndex: 1 },
      { question: 'ROI stands for?', options: ['Return on Investment', 'Rate of Income', 'Risk of Interest', 'None'], correctIndex: 0 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'graphic-design-canva',
    title: 'Graphic Design with Canva',
    icon: '🎨',
    description: 'Create professional social media posts, logos, and presentations using the worlds easiest design tool.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '2 Weeks',
    level: 'Beginner',
    assignments: 5,
    highlights: [
      'Color Theory for Non-Designers',
      'Typography Basics',
      'Layout and Composition',
      'Branding with Canva',
      'Designing for Web vs Print'
    ],
    lessons: [
      {
        lessonId: 'gd-l1',
        title: 'Design Principles',
        videoUrl: 'https://www.youtube.com/embed/YqQx75OPRa0',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'gd-l2',
        title: 'Canva Interface Tour',
        videoUrl: 'https://www.youtube.com/embed/nBNVpWpG-74',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'gd-l3',
        title: 'Creating Your First Post',
        videoUrl: 'https://www.youtube.com/embed/kYp2B-xZ9o0',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'Canva is a?', options: ['Cloud-based design tool', 'Video game', 'Database', 'Operating System'], correctIndex: 0 },
      { question: 'Typography refers to?', options: ['Colors', 'Fonts and Text', 'Icons', 'Borders'], correctIndex: 1 },
      { question: 'Which is a "Warm Color"?', options: ['Blue', 'Purple', 'Orange', 'Green'], correctIndex: 2 },
      { question: 'A Logo should be?', options: ['Complex', 'Simple and memorable', 'Many colors', 'Small font'], correctIndex: 1 },
      { question: 'Aspect ratio 1:1 is for?', options: ['Instagram Post', 'YouTube Banner', 'Movie Screen', 'Poster'], correctIndex: 0 },
      { question: 'White space in design is?', options: ['Empty space', 'Error', 'Wasted space', 'Always white'], correctIndex: 0 },
      { question: 'PNG supports?', options: ['Transparency', 'Animations', 'Heavy files', 'None'], correctIndex: 0 },
      { question: 'Canva "Brand Kit" helps in?', options: ['Consistency', 'Gaming', 'Coding', 'Music'], correctIndex: 0 },
      { question: 'Hierarchy in design helps in?', options: ['Guiding the eye', 'Filling space', 'Random looks', 'Adding weight'], correctIndex: 0 },
      { question: 'Sans Serif fonts are?', options: ['With feet', 'Without small feet/strokes', 'Handwritten', 'Cursive'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'cyber-security',
    title: 'Cyber Security Awareness',
    icon: '🛡️',
    description: 'Protect yourself from online threats. Learn about phishing, malware, and secure password habits.',
    price: 0,
    isPremium: false,
    isFree: true,
    duration: '1 Week',
    level: 'Beginner',
    assignments: 1,
    highlights: [
      'Identifying Phishing Scams',
      'Password Management (2FA)',
      'Public Wi-Fi Safety',
      'Social Engineering Attacks',
      'Browsing Safely'
    ],
    lessons: [
      {
        lessonId: 'sec-l1',
        title: 'Intro to Cyber Threats',
        videoUrl: 'https://www.youtube.com/embed/z5nc98S_T1w',
        pdfUrl: 'dummy_document.pdf',
        order: 1
      },
      {
        lessonId: 'sec-l2',
        title: 'Phishing & Scams',
        videoUrl: 'https://www.youtube.com/embed/XC_fS8A8nlo',
        pdfUrl: 'dummy_document.pdf',
        order: 2
      },
      {
        lessonId: 'sec-l3',
        title: 'Personal Data Security',
        videoUrl: 'https://www.youtube.com/embed/v7S-E0kH4vE',
        pdfUrl: 'dummy_document.pdf',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'What is Phishing?', options: ['Catching fish', 'Fraudulent emails to steal data', 'Fast coding', 'A type of virus'], correctIndex: 1 },
      { question: 'What does 2FA stand for?', options: ['Two Factor Authentication', 'Two File Access', 'To Find All', 'Second Floor Area'], correctIndex: 0 },
      { question: 'Which is a "Strong Password"?', options: ['123456', 'Password#123', 'X7&k#2Lp9m!q', 'MyName123'], correctIndex: 2 },
      { question: 'HTTPs is better than HTTP because?', options: ['It is faster', 'It is encrypted/secure', 'It has more colors', 'It is newer'], correctIndex: 1 },
      { question: 'Social engineering involves?', options: ['Mending hardware', 'Manipulating people', 'Writing algorithms', 'None'], correctIndex: 1 },
      { question: 'A Firewall is used for?', options: ['Heating', 'Blocking unauthorized access', 'Fast internet', 'Cleaning data'], correctIndex: 1 },
      { question: 'Malware stands for?', options: ['Malicious Software', 'Many Loops', 'Main Line', 'Map Layer'], correctIndex: 0 },
      { question: 'VPN stands for?', options: ['Virtual Private Network', 'Video Public Net', 'Valid Password Now', 'None'], correctIndex: 0 },
      { question: 'Public Wi-Fi is?', options: ['Very secure', 'Always safe', 'Potentially dangerous', 'Faster than home'], correctIndex: 2 },
      { question: 'Ransomware does what?', options: ['Steals data only', 'Encrypts files for money', 'Deletes Windows', 'Shows ads'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  }
];

async function seedFreeCourses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    for (const c of freeCourses) {
      const exists = await Course.findOne({ slug: c.slug });
      if (exists) {
        await Course.findOneAndUpdate({ slug: c.slug }, c, { new: true });
        console.log(`🔄 Updated: ${c.title}`);
      } else {
        await Course.create(c);
        console.log(`✅ Created: ${c.title}`);
      }
    }

    console.log('\n🎉 Free courses seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seedFreeCourses();
