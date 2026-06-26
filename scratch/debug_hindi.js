const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

const idx = text.indexOf('Section : Part-D-Hindi');
if (idx !== -1) {
    console.log('--- FOUND Part-D-Hindi ---');
    console.log(text.substring(idx, idx + 4000));
} else {
    console.log('Part-D-Hindi not found in extracted text.');
}
