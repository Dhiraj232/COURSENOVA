/**
 * courseContentGenerator.js
 * Comprehensive utility to provide subject-specific content for all courses.
 */

const TOPIC_CONTENT = {
    python: {
        videos: [
            { title: "Python Full Course for Beginners", url: "https://www.youtube.com/embed/_uQrJ0TkZlc" },
            { title: "Advanced Python OOP", url: "https://www.youtube.com/embed/Ej_02ICOIgs" }
        ],
        quizzes: [
            { question: "What is an f-string?", options: ["Formatted string", "False string", "Fast string", "None"], correctIndex: 0 },
            { question: "Python keyword for function?", options: ["func", "def", "define", "void"], correctIndex: 1 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    web: {
        videos: [
            { title: "HTML & CSS Crash Course", url: "https://www.youtube.com/embed/mU6anWqZJcc" },
            { title: "JavaScript Fundamentals", url: "https://www.youtube.com/embed/5fb2aPlgoys" }
        ],
        quizzes: [
            { question: "What does HTML stand for?", options: ["Hypertext Markup Language", "High Text", "Main Link", "None"], correctIndex: 0 },
            { question: "What is the DOM?", options: ["Data Model", "Document Object Model", "Direct Order", "None"], correctIndex: 1 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    pharma: {
        videos: [
            { title: "General Pharmacology Intro", url: "https://www.youtube.com/embed/RVA2N6tX2cg" },
            { title: "Drug Development Process", url: "https://www.youtube.com/embed/K9Vv-n6fJmI" },
            { title: "Pharmacovigilance Basics", url: "https://www.youtube.com/embed/9Os0o3wzS_I" }
        ],
        quizzes: [
            { question: "What is Pharmacovigilance?", options: ["Drug safety monitoring", "Drug manufacturing", "Drug selling", "None"], correctIndex: 0 },
            { question: "A Phase 1 clinical trial focuses on?", options: ["Safety & Dosage", "Mass effectiveness", "Marketing", "None"], correctIndex: 0 },
            { question: "What is a Placebo?", options: ["Active drug", "Inactive substance", "A side effect", "None"], correctIndex: 1 },
            { question: "GCP stands for?", options: ["Good Clinical Practice", "General Care Plan", "Global Cost Price", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    nursing: {
        videos: [
            { title: "Nursing Assessment Skills", url: "https://www.youtube.com/embed/z5nc98S_T1w" },
            { title: "Vital Signs Monitoring", url: "https://www.youtube.com/embed/RVA2N6tX2cg" },
            { title: "Patient Communication in Healthcare", url: "https://www.youtube.com/embed/HAnw168huqA" }
        ],
        quizzes: [
            { question: "Primary role of a nurse in patient care?", options: ["Diagnosis", "Monitoring & Advocacy", "Surgery", "None"], correctIndex: 1 },
            { question: "What is a normal blood pressure range?", options: ["120/80", "180/100", "90/60", "None"], correctIndex: 0 },
            { question: "What does CPR stand for?", options: ["Cardiopulmonary Resuscitation", "Care Patient Report", "Clinical Pulse Rate", "None"], correctIndex: 0 },
            { question: "The first step in a medical emergency is?", options: ["Assess safety", "Call for help", "Check breathing", "All of above"], correctIndex: 3 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    agriculture: {
        videos: [
            { title: "Modern Farming Techniques", url: "https://www.youtube.com/embed/oOzTTbwGKo4" },
            { title: "Smart Irrigation & Soil Health", url: "https://www.youtube.com/embed/Y7m9eNoB3NU" },
            { title: "Hydroponics for Beginners", url: "https://www.youtube.com/embed/rfscVS0vtbw" }
        ],
        quizzes: [
            { question: "What is Precision Agriculture?", options: ["Using tech to optimize yields", "Manual farming", "Only using drones", "None"], correctIndex: 0 },
            { question: "Hydroponics is farming without?", options: ["Water", "Soil", "Sunlight", "None"], correctIndex: 1 },
            { question: "Which nutrient is essential for soil health?", options: ["Nitrogen", "Glass", "Plastic", "None"], correctIndex: 0 },
            { question: "What is Organic Farming?", options: ["Farming without synthetic chemicals", "Using machines only", "Gaming", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    marketing: {
        videos: [
            { title: "Digital Marketing Fundamentals", url: "https://www.youtube.com/embed/nU-IIXBWlS4" },
            { title: "SEO Guide", url: "https://www.youtube.com/embed/nL-MRi7dqPw" }
        ],
        quizzes: [
            { question: "SEO stands for?", options: ["Search Engine Optimization", "Social Entry", "Main Link", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    excel: {
        videos: [
            { title: "Excel for Beginners", url: "https://www.youtube.com/embed/rB6DpbgPE-E" },
            { title: "Mastering Pivot Tables", url: "https://www.youtube.com/embed/ExcRbA7fy_A" },
            { title: "Advanced Excel Formulas", url: "https://www.youtube.com/embed/L72fhGm1tfE" }
        ],
        quizzes: [
            { question: "Which symbol starts a formula in Excel?", options: ["=", "@", "#", "+"], correctIndex: 0 },
            { question: "What is a Pivot Table primarily used for?", options: ["Summarizing data", "Deleting files", "Formatting text", "None"], correctIndex: 0 },
            { question: "VLOOKUP stands for?", options: ["Vertical Lookup", "Value Look", "View Logic", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    git: {
        videos: [
            { title: "Git & GitHub for Beginners", url: "https://www.youtube.com/embed/RGOj5yH7evk" },
            { title: "Understanding Git Branching", url: "https://www.youtube.com/embed/USjZcfj8yxE" },
            { title: "GitHub Pull Requests & Collaboration", url: "https://www.youtube.com/embed/8Dd7KRpKeaE" }
        ],
        quizzes: [
            { question: "Command to initialize a git repo?", options: ["git init", "git start", "git create", "git new"], correctIndex: 0 },
            { question: "How do you stage all changes in Git?", options: ["git add .", "git commit", "git push", "git stage"], correctIndex: 0 },
            { question: "What is a Pull Request?", options: ["A request to merge code", "A file deletion request", "A hardware fix", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    ai_basics: {
        videos: [
            { title: "AI Basics for Beginners", url: "https://www.youtube.com/embed/KJgsSFOSQv0" },
            { title: "How Machine Learning Works", url: "https://www.youtube.com/embed/WZkc54Dn6FI" },
            { title: "Generative AI Explained", url: "https://www.youtube.com/embed/G2fqAlgmoPo" }
        ],
        quizzes: [
            { question: "What does AI stand for?", options: ["Artificial Intelligence", "Automatic Info", "All Included", "None"], correctIndex: 0 },
            { question: "Which is an example of Generative AI?", options: ["ChatGPT", "Calculator", "Microsoft Excel", "Notepad"], correctIndex: 0 },
            { question: "Machine Learning is a subset of?", options: ["Artificial Intelligence", "Data Entry", "Hardware", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    time_management: {
        videos: [
            { title: "Time Management for Students", url: "https://www.youtube.com/embed/rKshz9jOn3s" },
            { title: "The Pomodoro Technique", url: "https://www.youtube.com/embed/mNBmG24djoY" }
        ],
        quizzes: [
            { question: "What is the Pomodoro technique?", options: ["Working in 25-min blocks", "Eating tomatoes", "Sleeping more", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    positive_attitude: {
        videos: [
            { title: "Building a Growth Mindset", url: "https://www.youtube.com/embed/hiiEe2UXuyk" },
            { title: "The Power of Positive Thinking", url: "https://www.youtube.com/embed/7X8mS3aH3mY" }
        ],
        quizzes: [
            { question: "What is a Growth Mindset?", options: ["Belief that skills can be developed", "Thinking you are already perfect", "Never making mistakes", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    leadership: {
        videos: [
            { title: "Leadership vs Management", url: "https://www.youtube.com/embed/rWA_rAit0D8" },
            { title: "How to Lead Teams", url: "https://www.youtube.com/embed/fW8amMCVAJQ" }
        ],
        quizzes: [
            { question: "A good leader primarily?", options: ["Inspires and guides", "Only gives orders", "Does everything alone", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    devops_cloud: {
        videos: [
            { title: "DevOps Crash Course", url: "https://www.youtube.com/embed/hQcFE0nv0Jo" },
            { title: "Cloud Computing Basics", url: "https://www.youtube.com/embed/M988_fsOSWo" },
            { title: "AWS Full Course", url: "https://www.youtube.com/embed/Z3SYDTn3kKo" }
        ],
        quizzes: [
            { question: "What is DevOps?", options: ["Culture of dev and ops collaboration", "Just coding", "Just servers", "None"], correctIndex: 0 },
            { question: "What does AWS stand for?", options: ["Amazon Web Services", "Alpha Web Sync", "All Web Storage", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    fullstack_mern: {
        videos: [
            { title: "MERN Stack Full Course", url: "https://www.youtube.com/embed/7CqJlxBYj-M" },
            { title: "Full Stack Development Roadmap", url: "https://www.youtube.com/embed/8kS9A4GfOig" }
        ],
        quizzes: [
            { question: "What does MERN stand for?", options: ["MongoDB, Express, React, Node", "MySQL, Extra, Redis, Node", "Main, Easy, Real, Net", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    },
    mobile_dev: {
        videos: [
            { title: "Mobile App Development Intro", url: "https://www.youtube.com/embed/fis26HvvDII" },
            { title: "React Native vs Flutter", url: "https://www.youtube.com/embed/6_r8wAb8p9Q" }
        ],
        quizzes: [
            { question: "Which is used for iOS development?", options: ["Swift", "HTML", "C++", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
    },
    product_mgmt: {
        videos: [
            { title: "Product Management 101", url: "https://www.youtube.com/embed/Rk0H979t6vU" },
            { title: "AI Product Management", url: "https://www.youtube.com/embed/5-ZpY_Y7O0w" }
        ],
        quizzes: [
            { question: "What is a Product Manager s role?", options: ["Bridging business, tech, and user", "Writing all the code", "Just marketing", "None"], correctIndex: 0 }
        ],
        pdf: "https://drive.google.com/file/d/1eGnWUr2DvPiILuTqHZSQYAZVomtkp-vL/view?usp=sharing"
    }
};

const GENERIC_CONTENT = {
    videos: [
        { title: "Introduction Module", url: "https://www.youtube.com/embed/KJgsSFOSQv0" },
        { title: "Advanced Workflows", url: "https://www.youtube.com/embed/EoYfa6mYOG4" }
    ],
    quizzes: [
        { question: "What is the primary goal discussed?", options: ["Understanding fundamentals", "Entertainment", "None", "All"], correctIndex: 0 }
    ],
    pdf: "https://drive.google.com/file/d/1vX9oXSuMEpVf9CmMChSSJJLgdXJ8Wkdl/view?usp=sharing"
};

function getRelevantContent(titleOrSlug) {
    const lower = titleOrSlug.toLowerCase();
    if (lower.includes('pharma') || lower.includes('drug') || lower.includes('clinical research')) return TOPIC_CONTENT.pharma;
    if (lower.includes('nurse') || lower.includes('nursing') || lower.includes('medical') || lower.includes('hospital') || lower.includes('clinical skills')) return TOPIC_CONTENT.nursing;
    if (lower.includes('agri') || lower.includes('farm') || lower.includes('soil') || lower.includes('crop')) return TOPIC_CONTENT.agriculture;
    if (lower.includes('python')) return TOPIC_CONTENT.python;
    if (lower.includes('web') || lower.includes('html') || lower.includes('js') || lower.includes('mern') || lower.includes('full stack') || lower.includes('fullstack')) return TOPIC_CONTENT.fullstack_mern;
    if (lower.includes('marketing') || lower.includes('seo')) return TOPIC_CONTENT.marketing;
    if (lower.includes('excel') || lower.includes('data analysis')) return TOPIC_CONTENT.excel;
    if (lower.includes('git') || lower.includes('github')) return TOPIC_CONTENT.git;
    if (lower.includes('ai basics') || lower.includes('artificial intelligence')) return TOPIC_CONTENT.ai_basics;
    if (lower.includes('time management')) return TOPIC_CONTENT.time_management;
    if (lower.includes('positive attitude')) return TOPIC_CONTENT.positive_attitude;
    if (lower.includes('leadership')) return TOPIC_CONTENT.leadership;
    if (lower.includes('devops') || lower.includes('cloud') || lower.includes('aws')) return TOPIC_CONTENT.devops_cloud;
    if (lower.includes('mobile app')) return TOPIC_CONTENT.mobile_dev;
    if (lower.includes('product management')) return TOPIC_CONTENT.product_mgmt;
    if (lower.includes('communication') || lower.includes('foundations')) return TOPIC_CONTENT.leadership; // Map to soft skills/leadership
    return GENERIC_CONTENT;
}

function generateLessons(courseSlug, topicContent) {
    return topicContent.videos.map((v, i) => ({
        lessonId: `${courseSlug}-l${i + 1}`,
        title: v.title,
        videoUrl: `${v.url}?rel=0`,
        pdfUrl: topicContent.pdf,
        order: i + 1
    }));
}

function generateQuiz(courseTitle, topicContent, targetCount = 10) {
    let baseQs = [...topicContent.quizzes];
    while (baseQs.length < targetCount) {
        const i = baseQs.length;
        baseQs.push({
            question: `Question ${i + 1}: What is a critical aspect of mastering ${courseTitle}?`,
            options: ["Understanding core concepts", "Skipping fundamentals", "Relying on luck", "None"],
            correctIndex: 0
        });
    }
    return baseQs.slice(0, targetCount);
}

module.exports = { getRelevantContent, generateLessons, generateQuiz };
