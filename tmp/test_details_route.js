const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/COURSENOVA/.env' });

const CourseSchema = new mongoose.Schema({}, { strict: false, collection: 'courses' });
const Course = mongoose.model('CourseTestRoute', CourseSchema);

const CourseProgressSchema = new mongoose.Schema({}, { strict: false, collection: 'courseprogresses' });
const CourseProgress = mongoose.model('CourseProgressTestRoute', CourseProgressSchema);

const { checkAccess } = require('../utils/accessControl');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // We assume a real userId from database to test checkAccess
    const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'storeusers' });
    const User = mongoose.model('UserTestRoute', UserSchema);
    
    const user = await User.findOne({});
    if (!user) {
        console.log('❌ No user found in DB!');
        process.exit(1);
    }
    
    const userId = String(user._id);
    const courseId = "ai basics for beginners";
    
    console.log(`Testing with User: "${user.get('email')}" (${userId}) and Course: "${courseId}"`);
    
    // Test checkAccess
    const hasAccess = await checkAccess(userId, courseId);
    console.log('checkAccess returned:', hasAccess);
    
    if (!hasAccess) {
        console.log('❌ checkAccess returned false. Access denied!');
    }
    
    const orQuery = [
        { title: courseId },
        { title: { $regex: new RegExp('^' + courseId.replace(/[-_]/g, ' ').replace(/\s+/g, '\\s*') + '$', 'i') } },
        { slug: courseId.toLowerCase().trim() },
        { slug: courseId.toLowerCase().replace(/\s+/g, '-').trim() },
        { slug: courseId.toLowerCase().replace(/-/g, ' ').trim() }
    ];
    
    const course = await Course.findOne({ $or: orQuery });
    console.log('Course found by query:', course ? course.get('title') : 'None');
    
    if (course) {
        const responseData = {
            ok: true,
            course: {
                _id: course._id,
                title: course.get('title'),
                slug: course.get('slug'),
                description: course.get('description'),
                lessons: course.get('lessons') || []
            }
        };
        console.log('Simulated response data ok:', responseData.ok);
        console.log('Simulated course title:', responseData.course.title);
        console.log('Simulated lessons length:', responseData.course.lessons.length);
    }
    
    process.exit(0);
}
run();
