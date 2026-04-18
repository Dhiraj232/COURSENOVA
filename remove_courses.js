const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');

async function remove() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const res = await Course.deleteMany({ 
            title: { $in: ['Digital Marketing Agency Mastery', 'Advanced Ethical Hacking Program'] } 
        });
        console.log(`✅ Successfully removed ${res.deletedCount} courses.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}
remove();
