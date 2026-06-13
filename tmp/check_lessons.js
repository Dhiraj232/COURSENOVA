const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/COURSENOVA/.env' });

const CourseSchema = new mongoose.Schema({}, { strict: false, collection: 'courses' });
const Course = mongoose.model('CourseCheckLessons', CourseSchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const courses = await Course.find({});
    console.log('Courses in DB:');
    courses.forEach(c => {
        const title = c.get('title');
        const lessons = c.get('lessons') || [];
        const quiz = c.get('quizQuestions') || [];
        console.log(`- Title: "${title}", Slug: "${c.get('slug')}", Lessons: ${lessons.length}, Quiz: ${quiz.length}`);
    });
    process.exit(0);
}
run();
