const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const MEDICAL_COURSES = [
    {
        title: 'Clinical Skills & Patient Care Certification',
        slug: 'clinical-skills-patient-care',
        icon: '🩺',
        description: 'Master the fundamental clinical skills required for patient care, from vital signs monitoring to basic clinical procedures.',
        highlights: ['Vital Signs Assessment', 'Patient Communication', 'Clinical Documentation', 'Hygiene & Safety'],
        level: 'Beginner',
        duration: '6 Weeks'
    },
    {
        title: 'Hospital Practical Knowledge & Ops',
        slug: 'hospital-practical-knowledge',
        icon: '🏥',
        description: 'Get hands-on insights into hospital operations, department management, and practical everyday medical workflows.',
        highlights: ['Ward Management', 'IPD/OPD Basics', 'Medicine Inventory', 'Patient Records'],
        level: 'Intermediate',
        duration: '5 Weeks'
    },
    {
        title: 'Emergency & First Aid Training',
        slug: 'emergency-first-aid-training',
        icon: '🚑',
        description: 'Be prepared for emergencies. Learn life-saving first aid techniques, CPR, and acute trauma management.',
        highlights: ['Basic Life Support (BLS)', 'Wound Care', 'Fracture Management', 'CPR Certification'],
        level: 'Beginner',
        duration: '3 Weeks'
    }
];

function generateLessons(courseTitle) {
    return [
        {
            lessonId: 'm1',
            title: 'Intro to ' + courseTitle,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 1
        },
        {
            lessonId: 'm2',
            title: 'Equipment & Safety Tools',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 2
        },
        {
            lessonId: 'm3',
            title: 'Practical Hands-on Procedure',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 3
        },
        {
            lessonId: 'm4',
            title: 'Reporting & Ethics',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            pdfUrl: '/dummy_document.pdf',
            order: 4
        }
    ];
}

function generateQuiz() {
    return [
        { question: 'What is the first step in a medical emergency?', options: ['Call for Help', 'Start CPR', 'Check Breathing', 'All of above'], correctIndex: 3 },
        { question: 'Which instrument is used to measure blood pressure?', options: ['Thermometer', 'Sphygmomanometer', 'Stethoscope', 'Glucometer'], correctIndex: 1 },
        { question: 'What does BLS stand for?', options: ['Basic Life Support', 'Blood Level Sync', 'Body Lipid Scale', 'Basic Lung Sound'], correctIndex: 0 },
        { question: 'In a hospital, what is OPD?', options: ['On-Patient Dept', 'Open Patient Desk', 'Out-Patient Department', 'Only Patient Dept'], correctIndex: 2 },
        { question: 'Highest priority in clinical ethics is?', options: ['Profit', 'Patient Privacy', 'Speed', 'Documentation'], correctIndex: 1 }
    ];
}

async function run() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        console.log('📦 Seeding Medical & Healthcare Courses...');
        for (const cData of MEDICAL_COURSES) {
            const price = Math.floor(Math.random() * (159 - 79 + 1) + 79);
            console.log(`   📝 Adding: ${cData.title} (₹${price})...`);
            
            await Course.create({
                ...cData,
                price: price,
                isFree: false,
                isPremium: true,
                category: 'Medical & Healthcare', // Grouping Tag
                assignments: 5,
                lessons: generateLessons(cData.title),
                quizQuestions: generateQuiz(),
                isActive: true
            });
        }

        console.log('\n✨ MEDICAL SEEDING COMPLETE!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
