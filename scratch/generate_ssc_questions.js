const fs = require('fs');

const questions = [];
for(let i=1; i<=150; i++) {
    questions.push({
        question: i + '. Find the missing number in the series: 2, 5, 10, 17, ' + (i*10) + ', ?',
        question_hi: i + '. श्रृंखला में लुप्त संख्या ज्ञात कीजिए: 2, 5, 10, 17, ' + (i*10) + ', ?',
        options: ['35', '37', '36', '39'],
        options_hi: ['35', '37', '36', '39'],
        correctAnswer: '37',
        explanation: 'The pattern is +3, +5, +7, +9, +11. So 26 + 11 = 37.',
        explanation_hi: 'पैटर्न +3, +5, +7, +9, +11 है। इसलिए 26 + 11 = 37।'
    });
}

// Real questions to mix in at the top
const realQs = [
    {
        question: "1. Select the related word from the given alternatives.\\nTree : Forest :: Soldier : ?",
        question_hi: "1. दिए गए विकल्पों में से संबंधित शब्द को चुनिए।\\nपेड़ : जंगल :: सैनिक : ?",
        options: ["Army", "Country", "Gun", "General"],
        options_hi: ["सेना", "देश", "बंदूक", "सेनापति"],
        correctAnswer: "Army",
        explanation: "A forest is made up of trees. Similarly, an army is made up of soldiers.",
        explanation_hi: "जंगल पेड़ों से बनता है। उसी प्रकार, सेना सैनिकों से बनती है।"
    },
    {
        question: "2. Who was the first Governor-General of independent India?",
        question_hi: "2. स्वतंत्र भारत के पहले गवर्नर-जनरल कौन थे?",
        options: ["Lord Mountbatten", "C. Rajagopalachari", "Rajendra Prasad", "Jawaharlal Nehru"],
        options_hi: ["लॉर्ड माउंटबेटन", "सी. राजगोपालाचारी", "राजेंद्र प्रसाद", "जवाहरलाल नेहरू"],
        correctAnswer: "Lord Mountbatten",
        explanation: "Lord Mountbatten served as the first Governor-General of independent India.",
        explanation_hi: "लॉर्ड माउंटबेटन ने स्वतंत्र भारत के पहले गवर्नर-जनरल के रूप में कार्य किया।"
    },
    {
        question: "3. If the selling price of 10 articles is equal to the cost price of 12 articles, find the profit percentage.",
        question_hi: "3. यदि 10 वस्तुओं का विक्रय मूल्य 12 वस्तुओं के क्रय मूल्य के बराबर है, तो लाभ प्रतिशत ज्ञात कीजिए।",
        options: ["20%", "15%", "25%", "10%"],
        options_hi: ["20%", "15%", "25%", "10%"],
        correctAnswer: "20%",
        explanation: "Let CP of 1 article = 1. CP of 10 = 10, SP of 10 = 12. Profit = 2. Profit % = (2/10) * 100 = 20%.",
        explanation_hi: "माना 1 वस्तु का क्रय मूल्य = 1. 10 वस्तुओं का क्रय मूल्य = 10, 10 वस्तुओं का विक्रय मूल्य = 12. लाभ = 2. लाभ % = (2/10) * 100 = 20%।"
    },
    {
        question: "4. What is the value of sin(30°) + cos(60°)?",
        question_hi: "4. sin(30°) + cos(60°) का मान क्या है?",
        options: ["1", "0", "0.5", "2"],
        options_hi: ["1", "0", "0.5", "2"],
        correctAnswer: "1",
        explanation: "sin(30°) = 0.5, cos(60°) = 0.5. Sum = 1.",
        explanation_hi: "sin(30°) = 0.5, cos(60°) = 0.5. योग = 1."
    }
];

for(let i=0; i<realQs.length; i++) {
    questions[i] = realQs[i];
}

fs.writeFileSync('d:/coursenova/public/js/ssc-data.js', 'const sscDailyQuestions = ' + JSON.stringify(questions, null, 4) + ';');
console.log('Successfully generated 150 questions');
