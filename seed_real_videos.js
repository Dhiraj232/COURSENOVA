const mongoose = require('mongoose');
const Course = require('./models/Course');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/renvox-bookstore';

const VIDEO_MAP = {
    'C Programming Fundamentals': 'KJgsSFOSQv0',
    'Data Structures Advanced': '8hly31xKli0',
    'Web Development Bootcamp': 'mU6anWqZJcc',
    'Python for Data Science': 'rfscVS0vtbw',
    'Database Management Systems': 'HXV3zeQKqGY',
    'Learning Essentials (Free)': 'jS4aFq5-91M',
    'Frontend Developer': 'mU6anWqZJcc',
    'Time Management': 'oTugjssqOT0',
    'JavaScript Advanced': 'jS4aFq5-91M',
    'Web Design': 'mU6anWqZJcc',
    'Communication Skills': 'HAnw168huqA',
    'default': 'jS4aFq5-91M'
};

async function fixVideos() {
    try {
        await mongoose.connect(MONGO_URI);
        const courses = await Course.find();
        let count = 0;
        
        for (const course of courses) {
            const vidId = VIDEO_MAP[course.title] || VIDEO_MAP['default'];
            const actualVideoLink = `https://www.youtube.com/embed/${vidId}?rel=0&modestbranding=1`;
            
            let changed = false;
            
            // if lessons exist, modify them
            if (course.lessons && course.lessons.length > 0) {
                for (let i = 0; i < course.lessons.length; i++) {
                    course.lessons[i].videoUrl = actualVideoLink;
                    changed = true;
                }
            } else {
                // If no lessons, create one
                course.lessons = [{
                    lessonId: 'lesson-1',
                    title: `Introduction to ${course.title}`,
                    videoUrl: actualVideoLink,
                    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    order: 0
                }];
                changed = true;
            }
            
            if (changed) {
                // To force Mongoose to save the subdocument array changes
                course.markModified('lessons');
                await course.save();
                count++;
            }
        }
        console.log(`Successfully updated embedded videos for ${count} courses.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixVideos();
