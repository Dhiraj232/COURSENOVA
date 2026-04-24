require('dotenv').config();
const mongoose = require('mongoose');
const { checkAccess } = require('../utils/accessControl');
const Course = require('../models/Course');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courseId = 'java-in-1-shot';
    
    console.log("Checking DB directly:");
    const c = await Course.findOne({ slug: courseId }).lean();
    console.log(c ? `Found: ${c.title}, isFree: ${c.isFree}` : "Not found!");
    
    console.log("Checking access with dummy user:");
    const hasAccess = await checkAccess('dummy_user', courseId);
    console.log("hasAccess:", hasAccess);
    
    process.exit(0);
}

test();
