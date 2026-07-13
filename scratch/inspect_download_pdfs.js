const fs = require('fs');
const path = require('path');
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
        throw new Error('pdf-parse module is not a function');
    };

async function inspectPdf(pdfPath) {
    console.log('================ Inspecting ' + path.basename(pdfPath) + ' ================');
    try {
        const buffer = fs.readFileSync(pdfPath);
        const result = await pdfParse(buffer);
        const text = result.text || '';
        console.log('Text length: ' + text.length);
        console.log('--- Preview (first 500 chars) ---');
        console.log(text.substring(0, 500));
    } catch (err) {
        console.error('Error reading ' + pdfPath + ':', err.message);
    }
}

async function main() {
    const downloadsDir = 'C:\\Users\\dhira\\Downloads';
    const files = ['81199.pdf', '81199 (1).pdf', '176887.pdf'];
    for (const f of files) {
        await inspectPdf(path.join(downloadsDir, f));
    }
}

main().catch(console.error);
