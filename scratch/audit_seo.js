const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const robotsPath = path.join(publicDir, 'robots.txt');

// Read robots.txt to get disallowed paths
let disallowedPaths = [];
try {
    const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
    disallowedPaths = robotsTxt
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.toLowerCase().startsWith('disallow:'))
        .map(line => line.split(':')[1].trim());
} catch (e) {
    console.error('Warning: could not read robots.txt', e.message);
}

const htmlFiles = fs.readdirSync(publicDir).filter(file => file.endsWith('.html'));

const auditResults = [];

htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract title
    const titleMatch = content.match(/<title>([^]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'MISSING';

    // Extract robots meta tag
    const robotsMatch = content.match(/<meta[^>]*?name=["']robots["'][^>]*?content=["']([^]*?)["'][^>]*?>/i) 
        || content.match(/<meta[^>]*?content=["']([^]*?)["'][^>]*?name=["']robots["'][^>]*?>/i);
    const robots = robotsMatch ? robotsMatch[1].trim() : 'MISSING';

    // Extract canonical tag
    const canonicalMatch = content.match(/<link[^>]*?rel=["']canonical["'][^>]*?href=["']([^]*?)["'][^>]*?>/i)
        || content.match(/<link[^>]*?href=["']([^]*?)["'][^>]*?rel=["']canonical["'][^>]*?>/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : 'MISSING';

    const route = '/' + file.replace('.html', '');
    const isDisallowedInRobots = disallowedPaths.some(disPath => {
        if (disPath === route) return true;
        // Simple prefix check
        if (disPath.endsWith('/') && route.startsWith(disPath)) return true;
        return false;
    });

    auditResults.push({
        file,
        route,
        title,
        robots,
        canonical,
        isDisallowedInRobots
    });
});

console.log(JSON.stringify(auditResults, null, 2));
