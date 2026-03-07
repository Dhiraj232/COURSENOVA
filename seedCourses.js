/**
 * seedCourses.js
 * Run ONCE to populate the MongoDB "courses" collection with the existing
 * hardcoded course data from certificates.html.
 *
 * Usage:
 *   node seedCourses.js
 *
 * Safe to run again — uses upsert so it won't create duplicates.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/renvox-bookstore';

const COURSES = [
    {
        slug: 'c-programming-fundamentals',
        title: 'C Programming Fundamentals',
        icon: '💻',
        description: 'Master C programming from scratch with practical assignments and real-world projects.',
        price: 79,
        isFree: false,
        duration: '4 Hours',
        level: 'Beginner',
        assignments: 6,
        highlights: ['6 Assignments', 'Live Projects', '4+ Hours Content', 'Job Ready Skills'],
        isActive: true
    },
    {
        slug: 'data-structures-advanced',
        title: 'Data Structures Advanced',
        icon: '🔗',
        description: 'Deep dive into data structures with interview prep and competitive programming.',
        price: 1199,
        isFree: false,
        duration: '6 Weeks',
        level: 'Intermediate',
        assignments: 12,
        highlights: ['12 Assignments', 'Interview Questions', 'Coding Challenges', 'Certificate'],
        isActive: true
    },
    {
        slug: 'web-development-bootcamp',
        title: 'Web Development Bootcamp',
        icon: '🌐',
        description: 'Complete web development course covering HTML, CSS, JavaScript, and React.',
        price: 1999,
        isFree: false,
        duration: '8 Weeks',
        level: 'Intermediate',
        assignments: 10,
        highlights: ['10 Projects', 'Portfolio Ready', 'Job Support', 'Lifetime Access'],
        isActive: true
    },
    {
        slug: 'python-for-data-science',
        title: 'Python for Data Science',
        icon: '🐍',
        description: 'Learn Python with NumPy, Pandas, Matplotlib for data science applications.',
        price: 999,
        isFree: false,
        duration: '5 Weeks',
        level: 'Intermediate',
        assignments: 7,
        highlights: ['7 Projects', 'Real Datasets', 'ML Basics', 'Career Ready'],
        isActive: true
    },
    {
        slug: 'database-management-systems',
        title: 'Database Management Systems',
        icon: '🗄️',
        description: 'Learn DBMS concepts with SQL and practical database design projects.',
        price: 599,
        isFree: false,
        duration: '3 Weeks',
        level: 'Beginner',
        assignments: 5,
        highlights: ['5 Assignments', 'SQL Mastery', 'Database Design', 'Verified Cert'],
        isActive: true
    },
    {
        slug: 'learning-essentials-free',
        title: 'Learning Essentials (Free)',
        icon: '📚',
        description: 'Free beginner course to understand RENVOX platform and learning basics.',
        price: 0,
        isFree: true,
        duration: '2 Weeks',
        level: 'Beginner',
        assignments: 3,
        highlights: ['3 Assignments', 'Free Access', 'Digital Certificate', 'No Credit Card'],
        isActive: true
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB:', MONGO_URI.split('@').pop() || MONGO_URI);

        let created = 0, updated = 0;
        for (const data of COURSES) {
            const result = await Course.findOneAndUpdate(
                { slug: data.slug },
                data,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                created++;
            } else {
                updated++;
            }
        }

        console.log(`\n🎓 Seeding complete!`);
        console.log(`   Created: ${created} new courses`);
        console.log(`   Updated: ${updated} existing courses`);
        console.log(`   Total:   ${COURSES.length} courses in DB\n`);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seed();
