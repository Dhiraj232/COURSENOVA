require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courseCount = await Course.countDocuments();
    const testCount = await MockTestPack.countDocuments();
    
    console.log('--- Final Status ---');
    console.log('Total Courses:', courseCount);
    console.log('Total Mock Packs:', testCount);
    
    if (courseCount === 37 && testCount === 16) {
        console.log('✅ Success: All 37 courses and 16 mock packs are present!');
    } else {
        console.log('❌ Error: Counts do not match expected values.');
    }
    
    process.exit(0);
}
check();
