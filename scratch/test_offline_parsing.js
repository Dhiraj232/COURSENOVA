const PDFDocument = require('pdfkit');
const { parsePDF } = require('../services/pdfParsingService');

// Generate a simple PDF in memory with valid MCQ formatting
const doc = new PDFDocument();
const buffers = [];
doc.on('data', buffers.push.bind(buffers));
doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    console.log("PDF generated. Size:", pdfBuffer.length);
    try {
        console.log("Parsing PDF offline...");
        const questions = await parsePDF(pdfBuffer, { category: 'Test Category', subject: 'Test Subject' }, 1);
        console.log("Parsed Questions count:", questions.length);
        if (questions.length > 0) {
            console.log("First question detail:");
            console.log("- Number:", questions[0].questionNumber);
            console.log("- Question text:", questions[0].question);
            console.log("- Options:", questions[0].options);
            console.log("- Correct answer index:", questions[0].correctIndex);
            console.log("- Correct answer text:", questions[0].correctAnswer);
            console.log("- Correct answer label:", questions[0].answer);
        } else {
            console.error("FAIL: No questions parsed!");
        }
        process.exit(0);
    } catch (err) {
        console.error("PARSING FAILED:", err);
        process.exit(1);
    }
});

doc.text("Q1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B", 100, 100);
doc.end();
