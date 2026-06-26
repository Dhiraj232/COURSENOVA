const fs = require('fs');
const text = fs.readFileSync('scratch/extracted_text.txt', 'utf8');

const qpatterns = [
    { section: 'Part-A', qNum: 6 },
    { section: 'Part-A', qNum: 12 },
    { section: 'Part-A', qNum: 16 }
];

qpatterns.forEach(qp => {
    const searchStr = `Q.${qp.qNum}`;
    let pos = 0;
    console.log(`\n--- Searching for Q.${qp.qNum} ---`);
    while ((pos = text.indexOf(searchStr, pos)) !== -1) {
        console.log(`Found at index ${pos}:`);
        console.log(text.substring(pos - 100, pos + 800));
        console.log('---------------------------------');
        pos += searchStr.length;
    }
});
