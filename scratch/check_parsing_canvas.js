const pdfParsing = require('../services/pdfParsingService');
console.log("pdfParsing loaded");
console.log("createCanvas check inside pdfParsingService:");
// Since createCanvas is not exported, we can test it by running a test parse
const PDFDocument = require('pdfkit');
const doc = new PDFDocument();
const buffers = [];
doc.on('data', buffers.push.bind(buffers));
doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    try {
        await pdfParsing.parsePDF(pdfBuffer, { category: 'Test', subject: 'Test' }, 1);
        console.log("Test parsing succeeded!");
    } catch (err) {
        console.log("Test parsing failed:", err.message);
    }
});
doc.text("Q1. Test?\nA) 1\nB) 2\nC) 3\nD) 4\nAnswer: A", 100, 100);
doc.end();
