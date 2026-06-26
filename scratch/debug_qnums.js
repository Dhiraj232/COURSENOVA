const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

const lines = text.split('\n').map(l => l.trim());
console.log('Total lines:', lines.length);

const matches = [];
lines.forEach((line, index) => {
    if (/^(?:Q|Question|प्र[.]?|प्रश्न)\s*[-.:]?\s*\d+/i.test(line) || /^\d{1,3}\s+[a-zA-Z\u0900-\u097F]/i.test(line)) {
        matches.push({ line, index });
    }
});

console.log(`Found ${matches.length} lines matching question start patterns.`);
console.log('First 30 matches:');
matches.slice(0, 30).forEach(m => console.log(`Line ${m.index}: "${m.line}"`));
