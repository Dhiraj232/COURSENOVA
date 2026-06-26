const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

const keywords = ['explanation', 'solution', 'व्याख्या', 'हल', 'detail'];
for (const kw of keywords) {
    let pos = 0;
    let count = 0;
    while ((pos = text.toLowerCase().indexOf(kw, pos)) !== -1) {
        count++;
        pos += kw.length;
    }
    console.log(`Keyword "${kw}": found ${count} times.`);
}
