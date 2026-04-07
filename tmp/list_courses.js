const mongoose = require('mongoose');
require('dotenv').config();

const CourseSchema = new mongoose.Schema({}, { strict: false, collection: 'courses' });
const Course = mongoose.model('CourseCheck', CourseSchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const courses = await Course.find({}, 'title slug price isPremium');
    console.log('Courses in DB:');
    courses.forEach(c => {
        console.log(`- Title: "${c.get('title')}", Slug: "${c.get('slug')}", Price: ${c.get('price')}, Premium: ${c.get('isPremium')}`);
    });
    process.exit(0);
}
run();
