require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');
const PracticeQuestion = require('../models/PracticeQuestion');

async function main() {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.');

    try {
        const packs = await MockTestPack.find();
        console.log(`Found ${packs.length} mock test packs.`);

        let totalQuestionsDeleted = 0;

        for (const pack of packs) {
            console.log(`Processing pack: "${pack.title}" (${pack.id})`);
            const qIdsToDelete = [];

            for (const test of pack.tests) {
                if (test.questions && test.questions.length > 0) {
                    test.questions.forEach(qid => qIdsToDelete.push(qid));
                }
                // Reset test fields
                test.questions = [];
                test.numQuestions = 0;
            }

            if (qIdsToDelete.length > 0) {
                const deleteResult = await PracticeQuestion.deleteMany({ _id: { $in: qIdsToDelete } });
                totalQuestionsDeleted += deleteResult.deletedCount;
                console.log(`  Deleted ${deleteResult.deletedCount} questions for this pack.`);
            }

            await pack.save();
            console.log(`  Saved mock test pack structure with cleared question links.`);
        }

        console.log('\n=======================================');
        console.log(`Purge Complete! Total Questions Deleted: ${totalQuestionsDeleted}`);
        console.log('=======================================');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database.');
    }
}

main().catch(console.error);
