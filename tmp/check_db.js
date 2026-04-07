const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const CourseSchema = new mongoose.Schema({
    title: String,
    slug: String,
    isPremium: Boolean,
    isFree: Boolean,
    price: Number
}, { collection: 'courses' });

const Course = mongoose.model('Course', CourseSchema);

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to Atlas');
        const courses = await Course.find({}, 'title slug isPremium isFree price');
        fs.writeFileSync('tmp/db_output.json', JSON.stringify(courses, null, 2));
        console.log('Done. Wrote to tmp/db_output.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
