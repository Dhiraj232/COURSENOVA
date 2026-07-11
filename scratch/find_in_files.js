const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                results = results.concat(walkDir(filePath));
            }
        } else {
            if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.json')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir('d:\\COURSENOVA');
let foundCount = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.toLowerCase().includes('translation missing') || content.toLowerCase().includes('[hindi')) {
            console.log(`Found match in: ${file}`);
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.toLowerCase().includes('translation missing') || line.toLowerCase().includes('[hindi')) {
                    console.log(`  Line ${idx + 1}: ${line.trim()}`);
                }
            });
            foundCount++;
        }
    } catch (e) {
        // ignore
    }
});

console.log(`Search complete. Found in ${foundCount} files.`);
process.exit(0);
