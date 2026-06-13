const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.html')) results.push(file);
        }
    });
    return results;
}

const files = walk('d:/COURSENOVA/public');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const regex = /^[ \t]*<li><a href="practice">Practice Zone<\/a><\/li>[ \t]*\r?\n/gm;
    if(regex.test(content)) {
        content = content.replace(regex, '');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
