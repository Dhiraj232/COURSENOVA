require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const python = await Course.findOne({ slug: 'python-programming-fundamentals' });
    const marketing = await Course.findOne({ slug: 'digital-marketing-fundamentals' });
    
    console.log('--- Python Course ---');
    console.log('Title:', python.title);
    console.log('First Lesson Video:', python.lessons[0].videoUrl);
    
    console.log('\n--- Marketing Course ---');
    console.log('Title:', marketing.title);
    console.log('First Lesson Video:', marketing.lessons[0].videoUrl);
    
    if (python.lessons[0].videoUrl !== marketing.lessons[0].videoUrl) {
        console.log('\n✅ Verification Success: Content is topic-specific!');
    } else {
        console.log('\n❌ Verification Failed: Content is identical.');
    }
    
    process.exit(0);
}

verify();
