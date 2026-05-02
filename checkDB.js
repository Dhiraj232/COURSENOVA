const mongoose = require('mongoose');
const DailyChallenge = require('./models/DailyChallenge');
const MONGO_URI = 'mongodb+srv://coursenovain_db_user:coursenova123@cluster0.xnokxr5.mongodb.net/coursenova?retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const challenges = await DailyChallenge.find({});
        console.log("Found", challenges.length, "challenges");
        challenges.forEach(c => {
            console.log(`- Date: ${c.date}, Exam: ${c.examType}, Title: ${c.title}, Questions: ${c.questions.length}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
