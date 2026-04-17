/**
 * seed-premium-courses.js
 * Seeds 3 premium courses into MongoDB.
 * Run: MONGO_URI=<your uri> node seed-premium-courses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course   = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const premiumCourses = [
  {
    slug: 'dsa-mastery',
    title: 'DSA Mastery',
    icon: '🧠',
    description: 'Master Data Structures & Algorithms from scratch to advanced level. Ace coding interviews at Google, Amazon, and top tech companies.',
    price: 499,
    isPremium: true,
    isFree: false,
    duration: '8 Weeks',
    level: 'Intermediate',
    assignments: 10,
    highlights: [
      'Arrays, LinkedLists, Trees, Graphs',
      'Sorting & Searching algorithms',
      '50+ coding problems with solutions',
      'Time & Space complexity mastery',
      'Interview-ready mock problems'
    ],
    lessons: [
      {
        lessonId: 'dsa-l1',
        title: 'Arrays & Strings',
        videoUrl: 'https://www.youtube.com/embed/8hly31xKli0',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 1
      },
      {
        lessonId: 'dsa-l2',
        title: 'Linked Lists & Stacks',
        videoUrl: 'https://www.youtube.com/embed/R9PTBwOzceo',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 2
      },
      {
        lessonId: 'dsa-l3',
        title: 'Trees & Graphs',
        videoUrl: 'https://www.youtube.com/embed/oSWTXtMglKE',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctIndex: 1 },
      { question: 'Which data structure uses LIFO order?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctIndex: 1 },
      { question: 'What is the height of a balanced binary tree with n nodes?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correctIndex: 2 },
      { question: 'Which algorithm is used for shortest path in a graph?', options: ['DFS', 'BFS', 'Dijkstra', 'Kruskal'], correctIndex: 2 },
      { question: 'Array index starts from?', options: ['1', '0', '-1', 'Depends on language'], correctIndex: 1 },
      { question: 'Which sorting algorithm has the best average time complexity?', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correctIndex: 2 },
      { question: 'What is a Hash Table used for?', options: ['Sorting', 'Fast key-value lookups', 'Graph traversal', 'Memory management'], correctIndex: 1 },
      { question: 'Which traversal visits root first?', options: ['Inorder', 'Postorder', 'Preorder', 'Level order'], correctIndex: 2 },
      { question: 'Space complexity of recursive Fibonacci is?', options: ['O(1)', 'O(n)', 'O(n²)', 'O(log n)'], correctIndex: 1 },
      { question: 'What does DFS stand for?', options: ['Data File System', 'Depth First Search', 'Distributed File Search', 'Dynamic Function Stack'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'anger-management',
    title: 'Anger Management & Emotional Intelligence',
    icon: '🧘',
    description: 'Learn proven techniques to control anger, manage emotions, and build healthy relationships in personal and professional life.',
    price: 299,
    isPremium: true,
    isFree: false,
    duration: '4 Weeks',
    level: 'Beginner',
    assignments: 5,
    highlights: [
      'Identify anger triggers',
      'Breathing & mindfulness techniques',
      'Conflict resolution skills',
      'Build emotional resilience',
      'Improve relationships & communication'
    ],
    lessons: [
      {
        lessonId: 'am-l1',
        title: 'Understanding Anger',
        videoUrl: 'https://www.youtube.com/embed/RVA2N6tX2cg',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 1
      },
      {
        lessonId: 'am-l2',
        title: 'Breathing & Mindfulness',
        videoUrl: 'https://www.youtube.com/embed/ihwcw_ofuME',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 2
      },
      {
        lessonId: 'am-l3',
        title: 'Conflict Resolution',
        videoUrl: 'https://www.youtube.com/embed/KY5TWVz5ZDU',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'Which technique helps manage sudden anger?', options: ['Shouting', 'Deep breathing', 'Running away', 'Ignoring'], correctIndex: 1 },
      { question: 'Emotional intelligence includes?', options: ['Only IQ', 'Self-awareness and empathy', 'Physical strength', 'Memory skills'], correctIndex: 1 },
      { question: 'What is a healthy way to express anger?', options: ['Yelling', 'Punching walls', 'Talking calmly', 'Staying silent forever'], correctIndex: 2 },
      { question: 'What triggers anger in most people?', options: ['Happy events', 'Threats or injustice', 'Sleeping', 'Eating'], correctIndex: 1 },
      { question: 'Mindfulness means?', options: ['Planning the future', 'Being present in the moment', 'Thinking about the past', 'Multitasking'], correctIndex: 1 },
      { question: 'Which hormone is released during anger?', options: ['Insulin', 'Melatonin', 'Adrenaline', 'Serotonin'], correctIndex: 2 },
      { question: 'The "10-second rule" helps by?', options: ['Giving time to calm down', 'Making you faster', 'Improving memory', 'Reducing sleep'], correctIndex: 0 },
      { question: 'Empathy means?', options: ['Feeling sorry', 'Understanding others feelings', 'Being selfish', 'Acting happy'], correctIndex: 1 },
      { question: 'What is conflict resolution?', options: ['Avoiding all conflict', 'Winning arguments', 'Finding mutually acceptable solutions', 'Blaming others'], correctIndex: 2 },
      { question: 'Which of these builds emotional resilience?', options: ['Isolation', 'Positive self-talk', 'Overthinking', 'Procrastination'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  },
  {
    slug: 'communication-skills',
    title: 'Professional Communication Skills',
    icon: '🎤',
    description: 'Develop powerful verbal and written communication skills for job interviews, presentations, and leadership roles in the workplace.',
    price: 399,
    isPremium: true,
    isFree: false,
    duration: '6 Weeks',
    level: 'Beginner',
    assignments: 7,
    highlights: [
      'Public speaking confidence',
      'Email & report writing',
      'Active listening skills',
      'Non-verbal communication',
      'Interview & presentation tactics'
    ],
    lessons: [
      {
        lessonId: 'cs-l1',
        title: 'Foundations of Communication',
        videoUrl: 'https://www.youtube.com/embed/HAnw168huqA',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 1
      },
      {
        lessonId: 'cs-l2',
        title: 'Public Speaking & Presentations',
        videoUrl: 'https://www.youtube.com/embed/JNOXZumCXNM',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 2
      },
      {
        lessonId: 'cs-l3',
        title: 'Professional Writing',
        videoUrl: 'https://www.youtube.com/embed/k3LCzsW0Sww',
        pdfUrl: 'https://docs.google.com/viewer?url=https://coursenova-ai.onrender.com/dummy_document.pdf&embedded=true',
        order: 3
      }
    ],
    quizQuestions: [
      { question: 'Active listening means?', options: ['Talking more', 'Fully concentrating on speaker', 'Checking phone', 'Interrupting often'], correctIndex: 1 },
      { question: 'Which is NOT a type of communication?', options: ['Verbal', 'Non-verbal', 'Written', 'Thinking alone'], correctIndex: 3 },
      { question: 'Body language accounts for approximately?', options: ['10% of communication', '55% of communication', '90% of communication', '5% of communication'], correctIndex: 1 },
      { question: 'A good email subject line should be?', options: ['Vague', 'Long and detailed', 'Clear and concise', 'All caps'], correctIndex: 2 },
      { question: 'The 7 Cs of communication include?', options: ['Clarity, Conciseness, Correctness', 'Confusion, Complexity', 'Criticism, Complaints', 'None of the above'], correctIndex: 0 },
      { question: 'Eye contact during a speech shows?', options: ['Nervousness', 'Confidence and engagement', 'Disinterest', 'Aggression'], correctIndex: 1 },
      { question: 'Feedback in communication is?', options: ['Not needed', "The receiver's response", 'Only written', 'Only verbal'], correctIndex: 1 },
      { question: 'Which is the best tone for professional emails?', options: ['Casual slang', 'Formal and polite', 'Angry', 'Sarcastic'], correctIndex: 1 },
      { question: 'What is a barrier to communication?', options: ['Clarity', 'Noise and distraction', 'Eye contact', 'Active listening'], correctIndex: 1 },
      { question: 'Paraphrasing helps by?', options: ['Confusing the speaker', 'Confirming understanding', 'Ending conversation', 'Interrupting'], correctIndex: 1 }
    ],
    examPassPercent: 60,
    isActive: true
  }
];

async function seedPremiumCourses() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    for (const c of premiumCourses) {
      const exists = await Course.findOne({ slug: c.slug });
      if (exists) {
        await Course.findOneAndUpdate({ slug: c.slug }, c, { new: true });
        console.log(`🔄 Updated: ${c.title}`);
      } else {
        await Course.create(c);
        console.log(`✅ Created: ${c.title}`);
      }
    }

    console.log('\n🎉 Premium courses seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seedPremiumCourses();
