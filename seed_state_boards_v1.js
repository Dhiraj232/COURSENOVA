/**
 * seed_state_boards_v1.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates 15+ State Boards and Mock Test Packs for the premium system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
require('dotenv').config();

const PracticeQuestion = require('./models/PracticeQuestion');
const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

const boards = [
    "Bihar Board", "UP Board", "CBSE", "ICSE", "Rajasthan Board",
    "MP Board", "Maharashtra Board", "West Bengal Board", "Tamil Nadu Board",
    "Karnataka Board", "Jharkhand Board", "Haryana Board", "Punjab Board",
    "Gujarat Board", "Odisha Board"
];

const subjects = ["Mathematics", "Science", "English", "Social Science", "Hindi"];

const sampleQuestions = [
    {
        en: "What is the square root of 144?",
        hi: "144 का वर्गमूल क्या है?",
        opts_en: ["10", "12", "14", "16"],
        opts_hi: ["10", "12", "14", "16"],
        ans: "12",
        subject: "Mathematics"
    },
    {
        en: "Which gas is essential for photosynthesis?",
        hi: "प्रकाश संश्लेषण के लिए कौन सी गैस आवश्यक है?",
        opts_en: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
        opts_hi: ["ऑक्सीजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन", "हाइड्रोजन"],
        ans: "Carbon Dioxide",
        subject: "Science"
    },
    {
        en: "Who wrote 'Discovery of India'?",
        hi: "'भारत की खोज' (Discovery of India) किसने लिखी?",
        opts_en: ["Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Patel", "B.R. Ambedkar"],
        opts_hi: ["महात्मा गांधी", "जवाहरलाल नेहरू", "सरदार पटेल", "बी.आर. आंबेडकर"],
        ans: "Jawaharlal Nehru",
        subject: "Social Science"
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB for seeding State Boards...');

        // 1. Clear existing State Board packs/questions to avoid duplicates
        await MockTestPack.deleteMany({ category: 'State Boards' });

        // 2. Create the "Master Series" pack (Unlock All)
        const masterPack = await MockTestPack.create({
            id: 'state-board-master',
            title: 'Paid Mock Test Series (All Boards)',
            category: 'Premium Series',
            description: 'Unlock 15+ State Boards and all subjects with a single purchase. Bilingual support included.',
            price: 59,
            isFree: false,
            totalTests: boards.length,
            thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
            isActive: true
        });

        console.log('🌟 Master Pack Created: ₹59 Series Unlocked.');

        // 3. Create individual Board Packs and Questions
        for (const boardName of boards) {
            console.log(`📦 Seeding ${boardName}...`);

            const boardPackId = boardName.toLowerCase().replace(/\s+/g, '-');
            const questions = [];

            // Create sample questions for this board
            for (let i = 0; i < 5; i++) { // 5 sample questions per board for now
                const qData = sampleQuestions[i % sampleQuestions.length];
                const q = await PracticeQuestion.create({
                    question: qData.en, // fallback
                    question_en: qData.en,
                    question_hi: qData.hi,
                    options: qData.opts_en, // fallback
                    options_en: qData.opts_en,
                    options_hi: qData.opts_hi,
                    correctAnswer: qData.ans,
                    category: boardName,
                    subject: qData.subject,
                    isMockTestOnly: true
                });
                questions.push(q._id);
            }

            // Create the board pack
            await MockTestPack.create({
                id: boardPackId,
                title: `${boardName} Complete Series`,
                category: 'State Boards',
                description: `Complete Mock Test Series for ${boardName} students.`,
                price: 59, // Same price as master for consistency, but logic will check if user has master access
                isFree: false,
                totalTests: subjects.length,
                thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
                tests: subjects.map(s => ({
                    testId: `${boardPackId}-${s.toLowerCase()}`,
                    testTitle: `${s} Practice Set`,
                    numQuestions: 5,
                    durationMinutes: 30,
                    questions: questions // Simplified: reuse same questions for demo
                }))
            });
        }

        console.log('🚀 State Boards Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
