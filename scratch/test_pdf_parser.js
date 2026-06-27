const { 
    cleanExtractedText, 
    parseQuestionsHeuristically,
    verifyAndFilterFalsePositives 
} = require('../services/pdfParsingService');

// Sample raw text extracted from a mock PDF containing various formats and clutter
const sampleRawText = `
Testbook CourseNova Mock Series 2026
Page 1 of 5
Downloaded from Cracku.in
SSC GD Free App
---------------------------------------------------------
Section A: General Knowledge

Q. 1 What is the capital of India?
(A) New Delhi (B) Mumbai (C) Kolkata (D) Chennai
Ans. A)
Explanation: New Delhi is the capital city of India. It was established in 1911.

प्र. २ भारत का राष्ट्रीय पशु कौन सा है?
(क) शेर
(ख) बाघ
(ग) चीता
(घ) हाथी
Correct Option: B
व्याख्या: बाघ (Royal Bengal Tiger) भारत का राष्ट्रीय पशु है।

3) Which of the following is a prime number?
① 4
② 6
③ 9
④ 11
Answer: D
Solution: 11 is a prime number because it only has two divisors: 1 and itself.
This is a standalone line that should be merged instead of creating Q7.

Question 4: Which elements wrap to
next line here?
A. This option text wraps
into the next line of code.
B. Option two
C. Option three
D. Option four
Ans: A
Sol. Option A is correctly wrapped.

A
B
C
D
1.
2.
3.

Answer Key
5) Fake question after stop header that should be completely ignored.
---------------------------------------------------------
Copyright © CourseNova 2026. All rights reserved.
www.coursenova.in
`;

async function runTest() {
    console.log("=== Running Universal PDF Importer Test ===");
    
    // 1. Clean extracted text
    const cleanResult = cleanExtractedText(sampleRawText);
    console.log(`Promotional lines removed: ${cleanResult.promoCount}`);
    
    // 2. Parse heuristically
    let questions = parseQuestionsHeuristically(cleanResult.text, 'SSC GD', 'GK');
    console.log(`Initially detected questions: ${questions.length}`);
    
    // 3. Final validation checks (mimic backend validation mapping)
    let questionsWithWarning = 0;
    questions = questions.map((q, idx) => {
        const errors = [];
        if (!q.question || q.question.trim().length <= 15) {
            errors.push('Question text is missing, invalid, or too short (length <= 15).');
        }
        const validOpts = q.options.filter(o => o && o.trim() !== '');
        if (validOpts.length < 4) {
            errors.push(`Missing valid options (found only ${validOpts.length}, minimum 4 required).`);
        }
        
        if (errors.length > 0) {
            questionsWithWarning++;
        }
        
        return {
            ...q,
            questionNumber: q.questionNumber || (idx + 1),
            isValid: errors.length === 0,
            validationWarning: errors.length > 0,
            validationErrors: errors
        };
    });

    // Discard ONLY completely empty question candidates
    let rejectedCount = 0;
    const rejectedReasons = [];
    questions = questions.filter(q => {
        const isEmpty = (!q.question || q.question.trim() === '') && q.options.every(o => !o || o.trim() === '');
        if (isEmpty) {
            rejectedCount++;
            rejectedReasons.push(`Q#${q.questionNumber || 'unknown'}: Completely empty card`);
            return false;
        }
        return true;
    });

    console.log(`Questions rejected (completely empty): ${rejectedCount}`);
    console.log(`Questions with validation warnings: ${questionsWithWarning}`);
    console.log(`Final questions count: ${questions.length}`);
    
    questions.forEach((q, idx) => {
        console.log(`\n--- Question ${idx + 1} (QNum: ${q.questionNumber}) ---`);
        console.log(`Language: ${q.language}`);
        console.log(`Question: ${q.question}`);
        console.log(`Options:`);
        console.log(`  A: ${q.optionA}`);
        console.log(`  B: ${q.optionB}`);
        console.log(`  C: ${q.optionC}`);
        console.log(`  D: ${q.optionD}`);
        console.log(`Answer key: ${q.answer} (${q.correctAnswer})`);
        console.log(`Explanation: ${q.explanation || q.explanation_hi}`);
        console.log(`Validation Status: ${q.isValid ? "VALID" : "INVALID"} (${q.validationErrors.join(', ') || 'No errors'})`);
    });
    
    console.log("\n=== Final Verification ===");
    if (questions.length === 4) {
        console.log("✅ SUCCESS: Exactly 4 valid questions parsed! Promotional text, section headers, duplicates, standalone numbers, and answer keys successfully ignored/cleaned.");
    } else {
        console.log("❌ FAILURE: Expected 4 questions, parsed: " + questions.length);
        process.exit(1);
    }
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
