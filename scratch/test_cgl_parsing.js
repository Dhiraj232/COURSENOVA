const fs = require('fs');
const path = require('path');
const { parsePDF } = require('../services/pdfParsingService');

async function main() {
    const pdfPath = 'C:\\\\Users\\\\dhira\\\\Downloads\\\\SSC CGL Tier l 27th July 2023 Shift-3 by Cracku.pdf';
    const buffer = fs.readFileSync(pdfPath);
    console.log('PDF loaded. Running parsePDF...');
    const questions = await parsePDF(buffer, { category: 'SSC CGL', subject: 'General' }, 100);
    console.log('Parsing completed. Total questions extracted:', questions.length);
    
    // Save to a scratch file
    fs.writeFileSync('scratch/cgl_parsed_questions.json', JSON.stringify(questions, null, 2), 'utf8');
    console.log('Saved to scratch/cgl_parsed_questions.json');
}

main().catch(console.error);
