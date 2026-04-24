const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const imagesDir = path.join(publicDir, 'images');
const oldLogoPath = path.join(imagesDir, 'logo coursenova.png');
const newLogoPath = path.join(imagesDir, 'coursenova-logo.png');
const sourceLogoPath = 'C:\\Users\\dhira\\.gemini\\antigravity\\brain\\18610527-94be-42e8-a11c-40972b08ded7\\media__1777048463769.png';

// 1. Copy the new logo
if (fs.existsSync(sourceLogoPath)) {
    fs.copyFileSync(sourceLogoPath, newLogoPath);
    console.log('Copied new logo successfully.');
} else {
    console.error('Source logo not found:', sourceLogoPath);
}

// 2. Delete the old logo
if (fs.existsSync(oldLogoPath)) {
    fs.unlinkSync(oldLogoPath);
    console.log('Deleted old logo successfully.');
}

// 3. Replace in HTML files
function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            replaceInDir(fullPath);
        } else if (stat.isFile() && fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace both encoded and unencoded versions
            content = content.replace(/images\/logo%20coursenova\.png/gi, 'images/coursenova-logo.png');
            content = content.replace(/images\/logo coursenova\.png/gi, 'images/coursenova-logo.png');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

replaceInDir(publicDir);
console.log('Done replacing logos in HTML files.');
