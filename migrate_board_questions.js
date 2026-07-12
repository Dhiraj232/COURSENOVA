const mongoose = require('mongoose');
require('dotenv').config();
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

const SUBJECT_KEYWORDS = {
    Physics: ['physics', 'coulomb', 'light', 'optic', 'force', 'charge', 'relativity', 'sound', 'velocity', 'prism', 'mirror', 'lens', 'magnetic', 'poles', 'unit of pressure', 'unit of force', 'si unit'],
    Chemistry: ['chemistry', 'acid', 'base', 'salt', 'chemical', 'reaction', 'formula', 'periodic', 'element', 'metal', 'organic', 'vinegar', 'table salt', 'nacl'],
    Mathematics: ['mathematics', 'math', 'integrate', 'integral', 'derivative', 'differentiate', 'equation', 'matrix', 'algebra', 'trigonometry', 'density', 'angle', 'integration'],
    Biology: ['biology', 'cell', 'mitosis', 'meiosis', 'chromosome', 'dna', 'gene', 'organ', 'liver', 'heart', 'kidney', 'skin', 'digest', 'enzyme', 'blood', 'xylem', 'phloem', 'plant', 'animal', 'human body', 'daughter cells'],
    English: ['author', 'poet', 'write', 'stands for', 'stands', 'full form', 'spelling', 'grammar', 'daffodils', 'merchant of venice', 'shakespeare', 'wordsworth', 'frost', 'orwell']
};

function detectSubject(qText) {
    const text = qText.toLowerCase();
    for (const [sub, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        for (const kw of keywords) {
            if (text.includes(kw)) {
                return sub;
            }
        }
    }
    return 'English'; // Fallback default
}

async function runMigration() {
    try {
        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully!');

        // Find all questions belonging to board exams
        const boardQueries = [
            { category: /board/i },
            { category: /class/i },
            { category: /cbse/i },
            { category: /bihar/i },
            { category: /up/i },
            { category: /punjab/i },
            { category: /icse/i }
        ];

        const questions = await PracticeQuestion.find({ $or: boardQueries });
        console.log(`🔍 Found ${questions.length} board questions to review...`);

        let updatedCount = 0;
        for (const q of questions) {
            const detected = detectSubject(q.question);
            if (q.subject !== detected) {
                const oldSub = q.subject;
                await PracticeQuestion.updateOne({ _id: q._id }, { $set: { subject: detected } });
                console.log(`   📝 Updated Q: "${q.question.substring(0, 40)}..." -> Subject: ${detected} (was: ${oldSub})`);
                updatedCount++;
            }
        }

        console.log(`\n🎉 MIGRATION COMPLETED! Updated subjects for ${updatedCount} questions.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
