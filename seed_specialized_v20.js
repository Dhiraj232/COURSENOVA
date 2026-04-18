const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI;

const PHARMA_COURSES = [
    {
        title: 'Drug Development & Clinical Research Basics',
        slug: 'drug-development-clinical-research',
        icon: '💊',
        category: 'B Pharma Students',
        description: 'Learn the stages of drug discovery, development, and the regulatory framework of clinical trials.',
        highlights: ['Drug Discovery Cycle', 'Clinical Trial Phases', 'Regulatory Affairs', 'GCP Compliance']
    },
    {
        title: 'Pharmaceutical Industry Training',
        slug: 'pharmaceutical-industry-training',
        icon: '🏭',
        category: 'B Pharma Students',
        description: 'Professional training on manufacturing, quality control, and laboratory standards in the pharma sector.',
        highlights: ['GMP Standards', 'Quality Assurance', 'Lab Safety', 'Manufacturing Ops']
    },
    {
        title: 'Pharmacovigilance Certification',
        slug: 'pharmacovigilance-certification',
        icon: '📝',
        category: 'B Pharma Students',
        description: 'Master the science of monitoring drug safety and managing adverse drug reactions effectively.',
        highlights: ['Drug Safety Monitoring', 'ADR Reporting', 'Signal Detection', 'Global Regulations']
    }
];

const AGRI_COURSES = [
    {
        title: 'Modern Farming Techniques',
        slug: 'modern-farming-techniques',
        icon: '🚜',
        category: 'Agriculture Students',
        description: 'Explore innovative farming methods including hydroponics, organic farming, and precision agriculture.',
        highlights: ['Precision Farming', 'Organic Certifications', 'Irrigation Tech', 'Yield Optimization']
    },
    {
        title: 'Agri-Business & Startup Guide',
        slug: 'agri-business-startup',
        icon: '💼',
        category: 'Agriculture Students',
        description: 'Step-by-step guide to starting and scaling your own agriculture business or agri-tech startup.',
        highlights: ['Market Analysis', 'Agri-Supply Chain', 'Financial Planning', 'Startup Funding']
    },
    {
        title: 'Crop Management & Soil Health',
        slug: 'crop-soil-health',
        icon: '🌱',
        category: 'Agriculture Students',
        description: 'Science-backed strategies for managing crop health and maintaining nutrient-rich soil year-round.',
        highlights: ['Soil Testing', 'Pest Management', 'Nutrient Cycling', 'Sustainable Soil']
    },
    {
        title: 'Agri-Tech & Smart Farming',
        slug: 'agri-tech-smart-farming',
        icon: '📡',
        category: 'Agriculture Students',
        description: 'Using IoT, drones, and AI to revolutionize farming efficiency and monitor farm health remotely.',
        highlights: ['Agri-IoT', 'Drone Monitoring', 'AI for Crops', 'Remote Sensing']
    }
];

function generateLessons(courseTitle) {
    return [
        { lessonId: 'm1', title: 'Module 1: Introduction', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdfUrl: '/dummy_document.pdf', order: 1 },
        { lessonId: 'm2', title: 'Module 2: Core Concepts', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdfUrl: '/dummy_document.pdf', order: 2 },
        { lessonId: 'm3', title: 'Module 3: Industry Case Studies', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdfUrl: '/dummy_document.pdf', order: 3 },
        { lessonId: 'm4', title: 'Module 4: Practical Assessment', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', pdfUrl: '/dummy_document.pdf', order: 4 }
    ];
}

function generateQuiz() {
    return [
        { question: 'What is the most critical factor discussed in this module?', options: ['Safety', 'Cost', 'Speed', 'Regulations'], correctIndex: 0 },
        { question: 'Which tool is standard in this industry?', options: ['Tool A', 'Tool B', 'Tool C', 'Tool D'], correctIndex: 1 },
        { question: 'How do we measure success in this field?', options: ['Output', 'Quality', 'User Feedback', 'Efficiency'], correctIndex: 1 },
        { question: 'Define the primary mission of this certification.', options: ['Skill Upskilling', 'Job Placement', 'Knowledge Growth', 'All of Above'], correctIndex: 3 },
        { question: 'Where is this concept mainly applied?', options: ['Industry', 'Research', 'Both', 'None'], correctIndex: 2 }
    ];
}

async function seed() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const allNew = [...PHARMA_COURSES, ...AGRI_COURSES];

        console.log('📦 Seeding Pharma & Agriculture Courses...');
        for (const cData of allNew) {
            const price = Math.floor(Math.random() * (129 - 69 + 1) + 69);
            console.log(`   📝 Adding: ${cData.title} (${cData.category} - ₹${price})...`);
            
            await Course.create({
                ...cData,
                price: price,
                isFree: false,
                isPremium: true,
                duration: '4-6 Weeks',
                level: 'Beginner',
                assignments: 4,
                lessons: generateLessons(cData.title),
                quizQuestions: generateQuiz(),
                isActive: true
            });
        }

        console.log('\n✨ SPECIALIZED SEEDING COMPLETE!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
