require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    try {
        const pack = await MockTestPack.findOne({ id: 'ssc-gd-free' });
        if (!pack) {
            console.log('ssc-gd-free pack not found!');
            return;
        }

        console.log('Original pack tests:', JSON.stringify(pack.tests, null, 2));

        const dummyId = new mongoose.Types.ObjectId().toString();
        const updatePayload = {
            tests: pack.tests.map(t => {
                if (t.testId === 'ssc-gd-free-s1') {
                    return {
                        testId: t.testId,
                        testTitle: t.testTitle,
                        durationMinutes: t.durationMinutes,
                        questions: [dummyId]
                    };
                }
                return t;
            })
        };

        console.log('Updating with payload:', JSON.stringify(updatePayload, null, 2));

        const updatedPack = await MockTestPack.findByIdAndUpdate(pack._id, updatePayload, { new: true });
        console.log('Updated pack tests (returned):', JSON.stringify(updatedPack.tests, null, 2));

        const fetchedPack = await MockTestPack.findById(pack._id);
        console.log('Fetched pack tests (from DB):', JSON.stringify(fetchedPack.tests, null, 2));

        // Restore to empty to not mess up
        await MockTestPack.findByIdAndUpdate(pack._id, {
            tests: pack.tests.map(t => ({
                testId: t.testId,
                testTitle: t.testTitle,
                durationMinutes: t.durationMinutes,
                questions: []
            }))
        });
        console.log('Restored original empty state.');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(console.error);
