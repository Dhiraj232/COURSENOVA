const mongoose = require('mongoose');
const Course = require('./models/Course');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova-bookstore';

// Conversion mapping: Number of weeks to approximate hours
const conversionRate = 10; // 1 week = 10 hours

async function fixDurations() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const courses = await Course.find();
        let updatedCount = 0;

        for (let course of courses) {
            let durationStr = course.duration;
            if (!durationStr) {
                // Determine a safe default based on lessons if duration missing
                let defaultHrs = (course.lessons && course.lessons.length > 0) ? course.lessons.length * 5 : 10;
                course.duration = `${defaultHrs} Hours`;
                await course.save();
                updatedCount++;
                continue;
            }

            // If it already says Hours, we can skip or normalize
            if (durationStr.toLowerCase().includes('hour')) {
                // It's already in hours, let's just make sure it's Capitalized
                course.duration = durationStr.replace(/hours/i, 'Hours').replace(/hour/i, 'Hours');
                await course.save();
                updatedCount++;
                continue;
            }

            // If it has 'week' or 'weeks'
            if (durationStr.toLowerCase().includes('week')) {
                // Extract number
                let match = durationStr.match(/\d+/);
                let weeks = match ? parseInt(match[0]) : 1;
                let hours = weeks * conversionRate;
                
                course.duration = `${hours} Hours`;
                await course.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated durations to Hours for ${updatedCount} courses.`);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

fixDurations();
