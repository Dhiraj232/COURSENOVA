const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./models/Course');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB.');

        // Nursing
        await Course.updateMany(
            { title: { $in: [
                'Clinical Skills & Patient Care Certification', 
                'Hospital Practical Knowledge & Ops', 
                'Emergency & First Aid Training'
            ]}},
            { $set: { category: 'BSc NURSING STUDENTS' } }
        );

        // Pharma
        await Course.updateMany(
            { title: { $in: [
                'Drug Development & Clinical Research Basics', 
                'Pharmaceutical Industry Training', 
                'Pharmacovigilance Certification'
            ]}},
            { $set: { category: 'B Pharma Students' } }
        );

        // Agri
        await Course.updateMany(
            { title: { $in: [
                'Modern Farming Techniques', 
                'Agri-Business & Startup Guide', 
                'Crop Management & Soil Health', 
                'Agri-Tech & Smart Farming'
            ]}},
            { $set: { category: 'Agriculture Students' } }
        );

        console.log('✨ All categories fixed in DB.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
