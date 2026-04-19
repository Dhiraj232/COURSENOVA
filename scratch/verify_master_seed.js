require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const categories = await Course.distinct('category');
    console.log('Detected Categories:', categories);
    
    const count = await Course.countDocuments();
    console.log('Total Courses:', count);
    
    const pharma = await Course.findOne({ category: 'B Pharma Students' });
    const nursing = await Course.findOne({ category: 'BSc NURSING STUDENTS' });
    const agri = await Course.findOne({ category: 'Agriculture Students' });
    
    console.log('\n--- Pharma Sample ---');
    console.log('Title:', pharma?.title);
    console.log('Video:', pharma?.lessons[0]?.videoUrl);
    
    console.log('\n--- Nursing Sample ---');
    console.log('Title:', nursing?.title);
    console.log('Video:', nursing?.lessons[0]?.videoUrl);
    
    console.log('\n--- Agriculture Sample ---');
    console.log('Title:', agri?.title);
    console.log('Video:', agri?.lessons[0]?.videoUrl);
    
    process.exit(0);
}
verify();
