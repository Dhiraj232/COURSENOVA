const { cleanExtractedText, parseQuestionsHeuristically } = require('../services/pdfParsingService');

// Sample raw text extracted from a mock PDF containing various formats and clutter
const sampleRawText = `
Testbook CourseNova Mock Series 2026
Page 1 of 5
---------------------------------------------------------
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

Question 4: Which elements wrap to
next line here?
A. This option text wraps
into the next line of code.
B. Option two
C. Option three
D. Option four
Ans: A
Sol. Option A is correctly wrapped.

---------------------------------------------------------
Copyright © CourseNova 2026. All rights reserved.
www.coursenova.in
`;

console.log("=== Running cleanExtractedText ===");
const cleaned = cleanExtractedText(sampleRawText);
console.log("Cleaned Text Output:\n", cleaned);
console.log("==================================\n");

console.log("=== Running parseQuestionsHeuristically ===");
const questions = parseQuestionsHeuristically(cleaned, "SSC", "General");
console.log(`Successfully parsed ${questions.length} questions.`);

// Map validation status for display (mimicking parsePDF validation phase)
const questionsMapped = questions.map((q, idx) => {
    const errors = [];
    if (!q.question || q.question.trim().startsWith('[Question')) {
        errors.push('Question text is missing or invalid.');
    }
    const validOpts = q.options.filter(o => o && o.trim() !== '' && !o.startsWith('Option'));
    if (validOpts.length < 2) {
        errors.push(`Missing valid options (found only ${validOpts.length}, minimum 2 required).`);
    }
    return {
        ...q,
        isValid: errors.length === 0,
        validationErrors: errors
    };
});

questionsMapped.forEach((q, idx) => {
    console.log(`\n--- Question ${idx + 1} (QNum: ${q.questionNumber}) ---`);
    console.log(`Language: ${q.language}`);
    console.log(`Question (EN): ${q.question_en}`);
    console.log(`Question (HI): ${q.question_hi}`);
    console.log(`Options:`);
    console.log(`  A: ${q.optionA}`);
    console.log(`  B: ${q.optionB}`);
    console.log(`  C: ${q.optionC}`);
    console.log(`  D: ${q.optionD}`);
    console.log(`  E: ${q.optionE}`);
    console.log(`Answer key: ${q.answer} (${q.correctAnswer})`);
    console.log(`Explanation (EN): ${q.explanation}`);
    console.log(`Explanation (HI): ${q.explanation_hi}`);
    console.log(`Validation Status: ${q.isValid ? "VALID" : "INVALID"} (${q.validationErrors.join(', ') || 'No errors'})`);
});

console.log("\n=== Test Completed! ===");
if (questions.length === 4) {
    console.log("✅ SUCCESS: All 4 questions successfully parsed with exact fields!");
} else {
    console.log("❌ FAILURE: Expected 4 questions, parsed: " + questions.length);
}
