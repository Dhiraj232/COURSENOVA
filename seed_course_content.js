const mongoose = require('mongoose');
const Course = require('./models/Course');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova-bookstore';

const FALLBACK_DATA = {
    'C Programming Fundamentals': { video: 'https://www.youtube.com/embed/KJgsSFOSQv0?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Data Structures Advanced': { video: 'https://www.youtube.com/embed/RBSGKlAvoiM?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Web Development Bootcamp': { video: 'https://www.youtube.com/embed/ysEN5RaKOlA?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Python for Data Science': { video: 'https://www.youtube.com/embed/LHBE0usLVCI?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Database Management Systems': { video: 'https://www.youtube.com/embed/HXV3zeQKqGY?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Learning Essentials (Free)': { video: 'https://www.youtube.com/embed/PkZNo7MFNFg?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Frontend Developer': { video: 'https://www.youtube.com/embed/G3e-cpL7ofc?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Time Management': { video: 'https://www.youtube.com/embed/oTugjssqOT0?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'JavaScript Advanced': { video: 'https://www.youtube.com/embed/PkZNo7MFNFg?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Web Design': { video: 'https://www.youtube.com/embed/mU6anWqZJcc?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'Communication Skills': { video: 'https://www.youtube.com/embed/HAnw168huqA?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    'default': { video: 'https://www.youtube.com/embed/PkZNo7MFNFg?rel=0', pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
};

async function seedLessons() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const courses = await Course.find();
        let updatedCount = 0;

        for (const course of courses) {
            const data = FALLBACK_DATA[course.title] || FALLBACK_DATA['default'];
            
            // Add a proper lesson if it's missing or empty
            if (!course.lessons || course.lessons.length === 0) {
                course.lessons = [
                    {
                        lessonId: 'lesson-1',
                        title: 'Module 1: Getting Started',
                        videoUrl: data.video,
                        pdfUrl: data.pdf,
                        order: 0
                    },
                    {
                        lessonId: 'lesson-2',
                        title: 'Module 2: Advanced Topics',
                        videoUrl: data.video,
                        pdfUrl: data.pdf,
                        order: 1
                    }
                ];
                await course.save();
                updatedCount++;
            }
        }

        console.log(`Successfully added video/pdf lessons to ${updatedCount} courses.`);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

seedLessons();
