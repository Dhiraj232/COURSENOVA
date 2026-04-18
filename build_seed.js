const fs = require('fs');

try {
    const v7Content = fs.readFileSync('c:\\coursenova\\seed_final_v7.js', 'utf8');

    // Split at the premium courses section
    let splitKey = '    // =========================================================================\r\n    // --- PAID COURSES (7) ---';
    if (!v7Content.includes(splitKey)) {
        splitKey = '    // =========================================================================\n    // --- PAID COURSES (7) ---';
    }

    const parts = v7Content.split(splitKey);
    if (parts.length < 2) {
        console.error("Could not find the Paid courses marker in seed_final_v7.js");
        process.exit(1);
    }

    const freeCoursesPart = parts[0];

    // Build the paid courses array as a string literal
    const premiumData = [
        { slug: 'time-management-fundamentals', title: 'Time Management Fundamentals', price: 79, icon: '⏳', pdf: 'PDFS.softSkills' },
        { slug: 'building-positive-attitude', title: 'Building Positive Attitude', price: 79, icon: '💡', pdf: 'PDFS.softSkills' },
        { slug: 'communication-foundations', title: 'Communication Foundations', price: 79, icon: '🗣️', pdf: 'PDFS.softSkills' },
        { slug: 'leadership-foundations', title: 'Leadership Foundations', price: 79, icon: '👑', pdf: 'PDFS.softSkills' },
        { slug: 'generative-ai-video', title: 'Generative AI Video Masterclass', price: 79, icon: '🎬', pdf: 'PDFS.genAI' },
        { slug: 'full-cycle-cybersecurity', title: 'Full-Cycle Cybersecurity Program', price: 99, icon: '🛡️', pdf: 'PDFS.cyber' },
        { slug: 'mern-stack-development-pro', title: 'MERN Stack Development Pro', price: 129, icon: '⚛️', pdf: 'PDFS.mern' },
        { slug: 'ai-product-management', title: 'AI Product Management', price: 99, icon: '🧥', pdf: 'PDFS.aiPM' },
        { slug: 'cloud-computing-aws', title: 'Cloud Computing with AWS', price: 129, icon: '☁️', pdf: 'PDFS.aws' },
        { slug: 'advanced-prompt-engineering', title: 'Advanced Prompt Engineering', price: 79, icon: '✍️', pdf: 'PDFS.prompt' },
        { slug: 'full-stack-placement', title: 'Full Stack Development + Placement Prep', price: 139, icon: '💻', pdf: 'PDFS.mern' },
        { slug: 'ai-ml-bootcamp', title: 'AI & Machine Learning Bootcamp', price: 149, icon: '🤖', pdf: 'PDFS.dataScience' },
        { slug: 'freelancing-mastery', title: 'Freelancing Mastery (Fiverr + Upwork)', price: 79, icon: '💸', pdf: 'PDFS.marketing' },
        { slug: 'digital-marketing-agency', title: 'Digital Marketing Agency Mastery', price: 99, icon: '📈', pdf: 'PDFS.marketing' },
        { slug: 'ethical-hacking-program', title: 'Advanced Ethical Hacking Program', price: 129, icon: '🔒', pdf: 'PDFS.cyber' },
        { slug: 'mobile-app-dev', title: 'Mobile App Development (Flutter / React Native)', price: 119, icon: '📱', pdf: 'PDFS.python' }
    ];

    let premiumString = `    // =========================================================================\n    // --- PAID COURSES (16) ---\n    // =========================================================================\n`;

    premiumData.forEach((c, idx) => {
        premiumString += `    {
        slug: '${c.slug}', title: '${c.title}', icon: '${c.icon}',
        description: 'Comprehensive curriculum designed to master ${c.title} and accelerate your career growth with real-world applications.',
        price: ${c.price}, isFree: false, isPremium: true,
        duration: '15 Hours', level: 'Intermediate', isActive: true, examPassPercent: 60,
        lessons: [
            { lessonId: '${c.slug}-l1', title: 'Introduction to ${c.title}', videoUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0?rel=0', pdfUrl: ${c.pdf}, order: 1 },
            { lessonId: '${c.slug}-l2', title: 'Core Strategies & Mechanics', videoUrl: 'https://www.youtube.com/embed/EoYfa6mYOG4?rel=0', pdfUrl: ${c.pdf}, order: 2 },
            { lessonId: '${c.slug}-l3', title: 'Advanced Workflows & Implementation', videoUrl: 'https://www.youtube.com/embed/WZkc54Dn6FI?rel=0', pdfUrl: ${c.pdf}, order: 3 },
            { lessonId: '${c.slug}-l4', title: 'Real-World Scenarios and Case Studies', videoUrl: 'https://www.youtube.com/embed/3wZ9L0O-jE0?rel=0', pdfUrl: ${c.pdf}, order: 4 }
        ],
        quizQuestions: Array.from({length: 15}, (_, i) => ({
            question: \`Question \${i+1}: What is the most critical aspect of mastering ${c.title}?\`,
            options: ['Implementing industry best practices consistently', 'Skipping fundamental steps', 'Relying on deprecated methods', 'Providing no output'],
            correctIndex: 0
        }))
    }${idx === premiumData.length - 1 ? '' : ','}\n`;
    });

    premiumString += `];\n\n// ─── 2. MOCK TEST PACKS DATA`;
    
    // The rest of the file after courses array ends
    let restOfFileSplit = '];\r\n\r\n// ─── 2. MOCK TEST PACKS DATA';
    if(!parts[1].includes(restOfFileSplit)) {
        restOfFileSplit = '];\n\n// ─── 2. MOCK TEST PACKS DATA';
    }
    
    const partsLower = parts[1].split(restOfFileSplit);
    if(partsLower.length < 2) {
       console.error("Could not find the end of courses array marker.");
       process.exit(1);
    }

    const restOfFile = partsLower[1];

    let finalContent = freeCoursesPart + premiumString + restOfFile;
    finalContent = finalContent.replace('Courses: 11 Free + 7 Paid = Total 18', 'Courses: 11 Free + 16 Paid = Total 27');

    fs.writeFileSync('c:\\coursenova\\seed_final_v8.js', finalContent, 'utf8');
    console.log("Successfully generated seed_final_v8.js with 16 precisely structured premium courses.");
} catch (e) {
    console.error(e);
}
