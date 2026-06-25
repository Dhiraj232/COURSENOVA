const PDFDocument = require('pdfkit');
const pdfParseModule = require('pdf-parse');

const pdfParse = typeof pdfParseModule === 'function' 
    ? (buffer, options) => pdfParseModule(buffer, options)
    : async function(buffer, options) {
        const { PDFParse } = pdfParseModule;
        if (PDFParse) {
            const parser = new PDFParse({ verbosity: 0, data: buffer });
            const result = await parser.getText(options);
            return { text: result.text || '' };
        }
        throw new Error('pdf-parse module is not a function and does not export PDFParse');
    };

// Generate a simple PDF in memory
const doc = new PDFDocument();
const buffers = [];
doc.on('data', buffers.push.bind(buffers));
doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    console.log("PDF generated. Size:", pdfBuffer.length);
    try {
        console.log("Parsing PDF...");
        const result = await pdfParse(pdfBuffer);
        console.log("Parsed Text successfully:", JSON.stringify(result.text));
    } catch (err) {
        console.error("PARSING FAILED:", err);
    }
});

doc.text("Q1. What is 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B", 100, 100);
doc.end();
