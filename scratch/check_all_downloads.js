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
        throw new Error('pdf-parse module is not a function and does not export PDFParse');
    };

async function checkFiles() {
    const dir = 'C:\\Users\\dhira\\Downloads';
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        console.log(`\n==================================================`);
        console.log(`File: ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
        
        try {
            const buffer = fs.readFileSync(filePath);
            const startTime = Date.now();
            const result = await pdfParse(buffer);
            console.log(`Parsed in ${((Date.now() - startTime)/1000).toFixed(2)}s. Text length: ${result.text.length} chars.`);
            
            // Check count of Q. or Question.
            const matches = result.text.match(/Q\s*[.]?\s*\d+/gi) || [];
            console.log(`Found ${matches.length} matches of Q.X/Question.X`);
            
            // Print some samples of text that aren't spaces or page indicators
            const nonSpacingLines = result.text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 5 && !line.includes('link.testbook') && !line.includes('Page '));
            console.log(`Sample non-empty lines:`);
            console.log(nonSpacingLines.slice(0, 10).join('\n'));
        } catch (e) {
            console.error(`Error parsing: ${e.message}`);
        }
    }
}

checkFiles().catch(console.error);
