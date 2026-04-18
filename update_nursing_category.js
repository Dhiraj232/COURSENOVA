const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB.');

        const res = await Course.updateMany(
            { category: 'Medical & Healthcare' },
            { $set: { category: 'BSc NURSING STUDENTS' } }
        );

        console.log(`✅ Successfully migrated ${res.modifiedCount} courses to BSc NURSING STUDENTS.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}
migrate();
