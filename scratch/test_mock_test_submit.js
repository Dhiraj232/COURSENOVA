const mongoose = require('mongoose');
const MockTestPack = require('../models/MockTestPack');
const MONGO_URI = 'mongodb+srv://coursenovain_db_user:coursenova123@cluster0.xnokxr5.mongodb.net/coursenova?retryWrites=true&w=majority';

async function testSubmit() {
    try {
        await mongoose.connect(MONGO_URI);
        const pack = await MockTestPack.findOne({ id: 'ssc-gd-free' });
        if (!pack) {
            console.error("Pack ssc-gd-free not found!");
            process.exit(1);
        }

        console.log("Original pack:", {
            title: pack.title,
            totalTests: pack.totalTests,
            totalQuestions: pack.totalQuestions,
            totalMarks: pack.totalMarks,
            durationMinutes: pack.durationMinutes
        });

        // Simulate PUT body
        const payload = {
            title: pack.title + " (Updated)",
            id: pack.id,
            category: pack.category,
            price: pack.price,
            isFree: pack.isFree,
            isActive: pack.isActive,
            description: pack.description,
            totalTests: 4, // manually setting to 4
            totalQuestions: 80, // manually overriding to 80
            totalMarks: 320, // manually overriding to 320
            durationMinutes: 60, // manually overriding to 60
            tests: pack.tests.map((t, idx) => ({
                testTitle: t.testTitle,
                testId: t.testId,
                durationMinutes: t.durationMinutes,
                numQuestions: idx === 0 ? 80 : 0, // set first subtest to 80 questions
                totalMarks: idx === 0 ? 320 : 0, // set first subtest to 320 marks
                questions: t.questions
            }))
        };

        // Call the save logic (directly using Mongoose save/update logic to test schema integration)
        if (payload.tests && Array.isArray(payload.tests)) {
            payload.tests.forEach(t => {
                if (t.numQuestions === undefined || t.numQuestions === null || t.numQuestions === 0) {
                    if (t.questions && Array.isArray(t.questions)) {
                        t.numQuestions = t.questions.length;
                    } else {
                        t.numQuestions = 0;
                    }
                }
                if (t.totalMarks === undefined || t.totalMarks === null || t.totalMarks === 0) {
                    t.totalMarks = t.numQuestions * 4;
                }
            });
        }

        const updatedPack = await MockTestPack.findByIdAndUpdate(pack._id, payload, { new: true });
        console.log("Updated pack:", {
            title: updatedPack.title,
            totalTests: updatedPack.totalTests,
            totalQuestions: updatedPack.totalQuestions,
            totalMarks: updatedPack.totalMarks,
            durationMinutes: updatedPack.durationMinutes,
            firstTestNumQuestions: updatedPack.tests[0].numQuestions,
            firstTestTotalMarks: updatedPack.tests[0].totalMarks
        });

        // Restore back to original values so we don't mess up production seed values permanently
        const restorePayload = {
            title: pack.title,
            id: pack.id,
            category: pack.category,
            price: pack.price,
            isFree: pack.isFree,
            isActive: pack.isActive,
            description: pack.description,
            totalTests: pack.totalTests,
            totalQuestions: pack.totalQuestions,
            totalMarks: pack.totalMarks,
            durationMinutes: pack.durationMinutes,
            tests: pack.tests.map(t => ({
                testTitle: t.testTitle,
                testId: t.testId,
                durationMinutes: t.durationMinutes,
                numQuestions: t.numQuestions,
                totalMarks: t.totalMarks,
                questions: t.questions
            }))
        };
        await MockTestPack.findByIdAndUpdate(pack._id, restorePayload);
        console.log("Restored original pack successfully.");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testSubmit();
