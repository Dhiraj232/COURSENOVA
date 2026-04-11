require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const MockTestPack = require('../models/MockTestPack');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const cFree = await Course.countDocuments({ price: 0 });
    const cPaid = await Course.countDocuments({ price: { $gt: 0 } });
    const mFree = await MockTestPack.countDocuments({ price: 0 });
    const mPaid = await MockTestPack.countDocuments({ price: { $gt: 0 } });
    
    console.log(`Courses: ${cFree} Free, ${cPaid} Paid`);
    console.log(`Mock Tests: ${mFree} Free, ${mPaid} Paid`);
    
    const courses = await Course.find({}, 'title price');
    console.log('\nCourse Prices:');
    courses.forEach(c => console.log(`- ${c.title}: ₹${c.price}`));
    
    const mocks = await MockTestPack.find({}, 'title price');
    console.log('\nMock Test Prices:');
    mocks.forEach(m => console.log(`- ${m.title}: ₹${m.price}`));
    
    process.exit(0);
}
check();
