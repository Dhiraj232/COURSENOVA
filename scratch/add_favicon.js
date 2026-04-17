const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const faviconTag = '\n    <!-- Favicon -->\n    <link rel="icon" type="image/png" href="/images/logo%20coursenova.png">\n';

let count = 0;
files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has a favicon (link rel=icon)
    if (!content.includes('<link rel="icon"')) {
        // insert before </head>
        content = content.replace('</head>', faviconTag + '</head>');
        fs.writeFileSync(filePath, content, 'utf8');
        count++;
        console.log(`Updated ${file}`);
    } else {
        console.log(`Skipped ${file} - already has favicon.`);
    }
});
console.log('Total files updated: ' + count);
