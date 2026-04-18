const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const courses = await Course.find({}, 'title category isFree price');
        console.log(JSON.stringify(courses, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
