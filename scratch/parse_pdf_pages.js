require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not defined in the environment.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using gemini-1.5-flash as it is highly capable at multimodal tasks and text extraction.
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function imageToGenerativePart(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType: "image/png"
        },
    };
}

async function parsePage(pageNum, answerKey, additionalInstructions = "") {
    console.log(`Processing Page ${pageNum}...`);
    const imagePath = path.join(__dirname, `page${pageNum}_upright.png`);
    const imagePart = imageToGenerativePart(imagePath);

    const prompt = `You are the CourseNova AI PDF Question Parser.
Your job is to extract every question from the uploaded page image and return ONLY valid JSON.
This is Page ${pageNum} of the Physics Model Paper.
Rules:
1. Extract ALL questions in the image.
2. Preserve the original language (English/Hindi/Mixed).
3. Never skip any question.
4. If a question contains an image or diagram, set "hasImage": true.
5. Extract options exactly as printed.
6. Detect the correct answer only if it is explicitly marked (✔, ✓, *, bold, circled, highlighted, answer key etc.). In this image, there are handwritten ticks near the correct options. Use the following answer key to confirm the correct answers for this page:
${answerKey}
If a question doesn't have an explicitly marked answer and is not in the key, return "correctAnswer": "". Never guess the answer.
7. Ignore page numbers, instructions, headers, footers, logos and watermarks.
8. Maintain original numbering.
9. Merge multiline questions into one line.
10. Remove duplicate questions.
11. Return ONLY JSON.
12. If options are written as (A) (B) (C) (D) or ①②③④ or क ख ग घ, convert them into optionA optionB optionC optionD.
13. ${additionalInstructions}
14. Return format:
[
  {
    "questionNo": 1,
    "question": "...",
    "optionA": "...",
    "optionB": "...",
    "optionC": "...",
    "optionD": "...",
    "correctAnswer": "...", // The exact text of the correct option matching optionA/B/C/D
    "difficulty": "Medium",
    "marks": 1,
    "language": "English",
    "hasImage": false,
    "imageDescription": "",
    "explanation": "...",
    "tags": []
  }
]`;

    let retries = 3;
    let delay = 3000;
    while (retries > 0) {
        try {
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const text = response.response.text().trim();
            let cleanText = text;
            if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(?:json)?\n?/, '');
                cleanText = cleanText.replace(/\n?```$/, '');
                cleanText = cleanText.trim();
            }

            const parsed = JSON.parse(cleanText);
            if (!Array.isArray(parsed)) {
                throw new Error("Response is not an array.");
            }
            console.log(`Page ${pageNum} parsed successfully. Found ${parsed.length} questions.`);
            return parsed;
        } catch (err) {
            retries--;
            console.error(`Error parsing Page ${pageNum} (retries remaining: ${retries}):`, err.message);
            if (retries === 0) {
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

async function main() {
    const page1Answers = "Q1: C, Q2: C, Q3: D, Q4: C, Q5: A, Q6: C, Q7: C, Q8: A, Q9: B, Q10: A, Q11: C, Q12: B, Q13: A, Q14: D";
    const page2Answers = "Q15: C, Q16: A, Q17: D, Q18: A, Q19: D, Q20: B, Q21: A, Q22: B, Q23: B, Q24: C, Q25: B, Q26: D, Q27: D, Q28: A, Q29: D, Q30: A, Q31: B, Q32: B, Q33: D, Q34: D, Q35: A, Q36: B, Q37: B, Q38: B, Q39: C, Q40: B, Q41: B, Q42: B, Q43: A";
    const page3Answers = "Q44: C, Q45: C, Q46: A, Q47: A, Q48: A, Q49: A, Q50: A, Q51: C, Q52: D, Q53: D, Q54: D, Q55: B, Q56: C, Q57: C, Q58: B, Q59: A, Q60: A, Q61: B, Q62: B, Q63: D, Q64: C, Q65: B, Q66: C, Q67: A, Q68: A, Q69: D, Q70: B";

    const q1To14 = await parsePage(1, page1Answers);
    const q15To43 = await parsePage(2, page2Answers);
    const q44To70 = await parsePage(3, page3Answers, "Question 56 contains a logic gate diagram. Set hasImage to true and describe the logic gate diagram in imageDescription.");

    const combinedQuestions = [...q1To14, ...q15To43, ...q44To70];
    
    // Sort by questionNo
    combinedQuestions.sort((a, b) => a.questionNo - b.questionNo);

    const finalOutput = {
        success: true,
        subject: "Physics",
        chapter: "Model Paper 1",
        questions: combinedQuestions
    };

    fs.writeFileSync(path.join(__dirname, 'extracted_questions_final.json'), JSON.stringify(finalOutput, null, 2), 'utf8');
    console.log(`Parsing complete! Total questions: ${combinedQuestions.length}`);
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
