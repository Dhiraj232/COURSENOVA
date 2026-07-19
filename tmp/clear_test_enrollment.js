const mongoose = require('mongoose');
require('dotenv').config();

const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const CourseOrder = require('../models/CourseOrder');
const Payment = require('../models/Payment');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB.');

    const courseSlug = 'mysql-database';
    const courseId = '69ebc9cf866ec8d8442942a6';

    // 1. Delete from Enrollment collection
    const delEnroll = await Enrollment.deleteMany({
        courseId: { $in: [courseId, courseSlug] }
    });
    console.log(`Deleted ${delEnroll.deletedCount} enrollment records.`);

    // 2. Delete from CourseOrder collection (strictly using ObjectId)
    const delOrder = await CourseOrder.deleteMany({
        courseId: new mongoose.Types.ObjectId(courseId)
    });
    console.log(`Deleted ${delOrder.deletedCount} CourseOrder records.`);

    // 3. Delete from legacy Payment collection (strictly using string ID)
    const delPay = await Payment.deleteMany({
        courseId: courseId
    });
    console.log(`Deleted ${delPay.deletedCount} legacy Payment records.`);

    // 4. Update Users
    const resUsers = await User.updateMany(
        {},
        {
            $pull: {
                enrolledCourses: { $in: [courseId, courseSlug, 'MySQL Database Complete Course'] },
                purchasedCourses: { $in: [courseId, courseSlug, 'MySQL Database Complete Course'] }
            }
        }
    );
    console.log(`Updated ${resUsers.modifiedCount} user profiles (removed enrollment access).`);

    console.log('Done! You can now test the purchase and Razorpay checkout for "MySQL Database Complete Course".');
    process.exit(0);
}
run();
