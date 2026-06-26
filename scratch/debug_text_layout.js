const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

const idx = text.indexOf('Section : Part-D-English');
if (idx !== -1) {
    console.log('--- FOUND Part-D-English ---');
    console.log(text.substring(idx, idx + 4000));
} else {
    console.log('Part-D-English not found in extracted text.');
}
