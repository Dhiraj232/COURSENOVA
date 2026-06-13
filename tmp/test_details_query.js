const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/COURSENOVA/.env' });

const CourseSchema = new mongoose.Schema({}, { strict: false, collection: 'courses' });
const Course = mongoose.model('CourseTestDetails', CourseSchema);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // We test the lookup logic for "ai basics for beginners"
    const courseId = "ai basics for beginners";
    
    const orQuery = [
        { title: courseId },
        { title: { $regex: new RegExp('^' + courseId.replace(/[-_]/g, ' ').replace(/\s+/g, '\\s*') + '$', 'i') } },
        { slug: courseId.toLowerCase().trim() },
        { slug: courseId.toLowerCase().replace(/\s+/g, '-').trim() },
        { slug: courseId.toLowerCase().replace(/-/g, ' ').trim() }
    ];
    
    console.log('Testing query:', JSON.stringify(orQuery, null, 2));
    
    const course = await Course.findOne({ $or: orQuery });
    if (course) {
        console.log('✅ Found course:', course.get('title'), 'Slug:', course.get('slug'));
    } else {
        console.log('❌ Course not found with query!');
    }
    
    // Let's print one sample course from DB
    const sample = await Course.findOne({});
    console.log('Sample course in DB:', sample ? { title: sample.get('title'), slug: sample.get('slug') } : 'None');
    
    process.exit(0);
}
run();
