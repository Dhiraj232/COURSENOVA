require('dotenv').config();
const mongoose = require('mongoose');
const PracticeQuestion = require('../models/PracticeQuestion');

async function runTest() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const testCategory = 'TempCategory_Test';
    const testSubject = 'TempSubject_Test';

    // Clean up any old test questions first
    await PracticeQuestion.deleteMany({ category: testCategory });

    console.log('Inserting a seed question to test duplicate checking...');
    const seedQuestion = await PracticeQuestion.create({
        question: 'What is the speed of light in vacuum?',
        question_en: 'What is the speed of light in vacuum?',
        question_hi: 'शून्य में प्रकाश की गति क्या है?',
        options: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
        options_en: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
        options_hi: ['299,792 किमी/सेकंड', '150,000 किमी/सेकंड', '300,000 किमी/सेकंड', '400,000 किमी/सेकंड'],
        correctAnswer: '299,792 km/s',
        category: testCategory,
        subject: testSubject,
        difficulty: 'Easy'
    });
    console.log('Seed question created.');

    // Simulated parsed questions from Gemini
    const mockParsedFromGemini = [
        // Duplicate (English match)
        {
            question: 'What is the speed of light in vacuum?',
            question_en: 'What is the speed of light in vacuum?',
            question_hi: 'शून्य में प्रकाश की गति क्या है?',
            options: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
            options_en: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
            options_hi: ['299,792 किमी/सेकंड', '150,000 किमी/सेकंड', '300,000 किमी/सेकंड', '400,000 किमी/सेकंड'],
            correctAnswer: '299,792 km/s',
            category: testCategory,
            subject: testSubject,
            difficulty: 'Easy'
        },
        // Duplicate (Hindi match, variations in spacing/punctuation)
        {
            question: 'शून्य में प्रकाश की गति क्या है?',
            question_en: 'What is the speed of light in vacuum?',
            question_hi: 'शून्य में प्रकाश की गति क्या है?',
            options: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
            options_en: ['299,792 km/s', '150,000 km/s', '300,000 km/s', '400,000 km/s'],
            options_hi: ['299,792 किमी/सेकंड', '150,000 किमी/सेकंड', '300,000 किमी/सेकंड', '400,000 किमी/सेकंड'],
            correctAnswer: '299,792 km/s',
            category: testCategory,
            subject: testSubject,
            difficulty: 'Easy'
        },
        // New question 1
        {
            question: 'What is the chemical formula for water?',
            question_en: 'What is the chemical formula for water?',
            question_hi: 'पानी का रासायनिक सूत्र क्या है?',
            options: ['CO2', 'H2O', 'NaCl', 'O2'],
            options_en: ['CO2', 'H2O', 'NaCl', 'O2'],
            options_hi: ['CO2', 'H2O', 'NaCl', 'O2'],
            correctAnswer: 'H2O',
            category: testCategory,
            subject: testSubject,
            difficulty: 'Easy'
        },
        // New question 2
        {
            question: 'Who wrote the play Hamlet?',
            question_en: 'Who wrote the play Hamlet?',
            question_hi: 'हैमलेट नाटक किसने लिखा था?',
            options: ['Charles Dickens', 'William Shakespeare', 'Leo Tolstoy', 'Mark Twain'],
            options_en: ['Charles Dickens', 'William Shakespeare', 'Leo Tolstoy', 'Mark Twain'],
            options_hi: ['चार्ल्स डिकेंस', 'विलियम शेक्सपियर', 'लियो टॉल्स्टॉय', 'मार्क ट्वेन'],
            correctAnswer: 'William Shakespeare',
            category: testCategory,
            subject: testSubject,
            difficulty: 'Medium'
        }
    ];

    console.log('Running route duplicate filtering logic locally...');
    const questionTexts = mockParsedFromGemini.map(q => q.question).filter(Boolean);
    const questionEnTexts = mockParsedFromGemini.map(q => q.question_en).filter(Boolean);

    // Fetch existing
    const existingQuestions = await PracticeQuestion.find({
        $or: [
            { question: { $in: questionTexts } },
            { question_en: { $in: questionEnTexts } }
        ]
    });

    function cleanText(text) {
        if (!text) return '';
        return text.trim().toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
    }

    const existingSet = new Set();
    existingQuestions.forEach(q => {
        if (q.question) existingSet.add(cleanText(q.question));
        if (q.question_en) existingSet.add(cleanText(q.question_en));
    });

    const uniqueQuestions = [];
    let duplicateCount = 0;
    let failedCount = 0;

    for (const q of mockParsedFromGemini) {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 4 || !q.correctAnswer) {
            failedCount++;
            continue;
        }

        const formattedQ = {
            question: q.question,
            question_en: q.question_en || q.question,
            question_hi: q.question_hi || q.question,
            options: q.options,
            options_en: q.options_en || q.options,
            options_hi: q.options_hi || q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            category: q.category,
            subject: q.subject,
            topic: q.topic || '',
            difficulty: q.difficulty || 'Medium',
            isMockTestOnly: !!q.isMockTestOnly
        };

        const cleanQ = cleanText(formattedQ.question);
        const cleanQEn = cleanText(formattedQ.question_en);

        if (existingSet.has(cleanQ) || (cleanQEn && existingSet.has(cleanQEn))) {
            duplicateCount++;
        } else {
            uniqueQuestions.push(formattedQ);
        }
    }

    console.log(`Duplicate Count (should be 2): ${duplicateCount}`);
    console.log(`Unique to Insert (should be 2): ${uniqueQuestions.length}`);

    if (duplicateCount !== 2 || uniqueQuestions.length !== 2) {
        throw new Error(`Assertion failed! Expected 2 duplicates and 2 unique, but got ${duplicateCount} duplicates and ${uniqueQuestions.length} unique.`);
    }

    // Insert
    let importedCount = 0;
    const batchSize = 20;
    for (let i = 0; i < uniqueQuestions.length; i += batchSize) {
        const batch = uniqueQuestions.slice(i, i + batchSize);
        await PracticeQuestion.insertMany(batch);
        importedCount += batch.length;
    }
    console.log(`Successfully batch inserted ${importedCount} unique questions.`);

    // Verify in database
    const dbCount = await PracticeQuestion.countDocuments({ category: testCategory });
    console.log(`Total questions in category ${testCategory}: ${dbCount} (should be 3 - the seed + 2 new)`);

    if (dbCount !== 3) {
        throw new Error(`Assertion failed! Expected 3 questions in database, but found ${dbCount}`);
    }

    // Clean up database
    console.log('Cleaning up test data...');
    await PracticeQuestion.deleteMany({ category: testCategory });
    console.log('Cleaned.');

    console.log('All tests passed successfully!');
}

runTest()
    .then(() => mongoose.disconnect())
    .catch(err => {
        console.error('Test failed:', err);
        mongoose.disconnect();
        process.exit(1);
    });
