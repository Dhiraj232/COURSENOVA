const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');
const lines = text.split('\n');

for (let i = 25; i <= 65; i++) {
    console.log(`Line ${i}: "${lines[i]}"`);
}
