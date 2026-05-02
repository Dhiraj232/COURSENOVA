const mongoose = require('mongoose');
const DailyChallenge = require('../models/DailyChallenge');

const MONGO_URI = 'mongodb+srv://coursenovain_db_user:coursenova123@cluster0.xnokxr5.mongodb.net/coursenova?retryWrites=true&w=majority';

async function seed() {
    // Try to find the real URI from environment or server.js
    // For now, I'll assume the script is run in the environment where mongoose is already configured or I'll just create the data.
    
    const today = new Date().toISOString().split('T')[0];

    const challenges = [
        {
            date: today,
            examType: 'SSC CGL',
            title: `SSC CGL Daily Practice Set - ${today}`,
            questions: [
                {
                    question: "Who was the first woman Governor of an Indian State?",
                    question_hi: "किसी भारतीय राज्य की पहली महिला राज्यपाल कौन थीं?",
                    options: ["Sarojini Naidu", "Sucheta Kripalani", "Indira Gandhi", "Vijayalakshmi Pandit"],
                    options_hi: ["सरोजिनी नायडू", "सुचेता कृपलानी", "इन्दिरा गांधी", "विजयालक्ष्मी पंडित"],
                    correctAnswer: "Sarojini Naidu",
                    explanation: "Sarojini Naidu was the first woman to become the governor of an Indian state (Uttar Pradesh)."
                },
                {
                    question: "The power to decide an election petition is vested in the?",
                    question_hi: "चुनाव याचिका पर निर्णय लेने की शक्ति किसमें निहित है?",
                    options: ["Parliament", "Supreme Court", "High Courts", "Election Commission"],
                    options_hi: ["संसद", "उच्चतम न्यायालय", "उच्च न्यायालय", "चुनाव आयोग"],
                    correctAnswer: "High Courts",
                    explanation: "Election petitions are heard by High Courts."
                }
            ]
        },
        {
            date: today,
            examType: 'Railway Group D',
            title: `Railway Group D Mock Set - ${today}`,
            questions: [
                {
                    question: "Which of the following is a unit of Power?",
                    question_hi: "निम्नलिखित में से कौन शक्ति की इकाई है?",
                    options: ["Watt", "Joule", "Newton", "Pascal"],
                    options_hi: ["वाट", "जूल", "न्यूटन", "पास्कल"],
                    correctAnswer: "Watt",
                    explanation: "Watt is the SI unit of power."
                }
            ]
        },
        {
            date: today,
            examType: 'CTET',
            title: `CTET Paper 1 Daily Set - ${today}`,
            questions: [
                {
                    question: "The most critical period of acquisition and development of language is?",
                    question_hi: "भाषा के अधिग्रहण और विकास का सबसे महत्वपूर्ण काल कौन सा है?",
                    options: ["Pre-natal period", "Early childhood", "Middle childhood", "Adolescence"],
                    options_hi: ["पूर्व-प्रसव काल", "प्रारंभिक बचपन", "मध्य बचपन", "किशोरावस्था"],
                    correctAnswer: "Early childhood",
                    explanation: "Early childhood is considered the sensitive period for language development."
                }
            ]
        },
        {
            date: today,
            examType: 'Army GD',
            title: `Indian Army GD Practice Set - ${today}`,
            questions: [
                {
                    question: "What is the capital of France?",
                    question_hi: "फ्रांस की राजधानी क्या है?",
                    options: ["Berlin", "London", "Paris", "Rome"],
                    options_hi: ["बर्लिन", "लंदन", "पेरिस", "रोम"],
                    correctAnswer: "Paris"
                }
            ]
        },
        {
            date: today,
            examType: 'Bihar Police',
            title: `Bihar Police Constable Set - ${today}`,
            questions: [
                {
                    question: "Which river is known as the Sorrow of Bihar?",
                    question_hi: "किस नदी को 'बिहार का शोक' कहा जाता है?",
                    options: ["Ganga", "Kosi", "Son", "Gandak"],
                    options_hi: ["गंगा", "कोसी", "सोन", "गंडक"],
                    correctAnswer: "Kosi"
                }
            ]
        },
        {
            date: today,
            examType: 'SSC GD',
            title: `SSC GD Constable Daily Set - ${today}`,
            questions: [
                {
                    question: "Who is known as the Iron Man of India?",
                    question_hi: "भारत के 'लौह पुरुष' के रूप में किसे जाना जाता है?",
                    options: ["Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "Mahatma Gandhi", "Subhas Chandra Bose"],
                    options_hi: ["जवाहरलाल नेहरू", "सरदार वल्लभभाई पटेल", "महात्मा गांधी", "सुभाष चंद्र बोस"],
                    correctAnswer: "Sardar Vallabhbhai Patel"
                }
            ]
        }
    ];

    // Connect and save
    try {
        if (mongoose.connection.readyState === 0) {
            console.log("Connecting to MongoDB...");
            await mongoose.connect(MONGO_URI);
        }
        
        console.log("Seeding data for:", today);
        for (const c of challenges) {
            await DailyChallenge.findOneAndUpdate(
                { date: c.date, examType: c.examType },
                c,
                { upsert: true, new: true }
            );
        }
        console.log("Seeding completed successfully!");
        if (require.main === module) process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        if (require.main === module) process.exit(1);
    }
}

if (require.main === module) {
    seed();
}

module.exports = seed;

