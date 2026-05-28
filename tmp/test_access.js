const { checkAccess } = require('../utils/accessControl');
const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const Course = require('../models/Course');
    const MockTestPack = require('../models/MockTestPack');
    const Enrollment = require('../models/Enrollment');
    
    const sampleCourse = await Course.findOne({ price: { $gt: 0 } });
    const samplePack = await MockTestPack.findOne({ price: { $gt: 0 } });
    const freeCourse = await Course.findOne({ isFree: true });
    
    console.log('--- Testing Access Control ---');
    
    // Test 1: Free Course (should be true for null user)
    const access1 = await checkAccess(null, freeCourse._id);
    console.log(`Free Course Access (No User): ${access1} (Expected: true)`);
    
    // Test 2: Paid Course (should be false for unknown user)
    const access2 = await checkAccess(new mongoose.Types.ObjectId(), sampleCourse._id);
    console.log(`Paid Course Access (Random User): ${access2} (Expected: false)`);
    
    // Test 3: Paid Mock Pack (should be false for unknown user)
    const access3 = await checkAccess(new mongoose.Types.ObjectId(), samplePack.id);
    console.log(`Paid Pack Access (Random User): ${access3} (Expected: false)`);
    
    // Create a dummy enrollment for testing
    const testUserId = "TEST_USER_" + Date.now();
    await Enrollment.create({
        userId: testUserId,
        courseId: String(sampleCourse._id),
        courseName: sampleCourse.title
    });
    
    const access4 = await checkAccess(testUserId, sampleCourse._id);
    console.log(`Paid Course Access (Enrolled User): ${access4} (Expected: true)`);
    
    // Cleanup
    await Enrollment.deleteOne({ userId: testUserId });
    
    process.exit(0);
}

test();
