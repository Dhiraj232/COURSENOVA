// Fetch individual video IDs from YouTube playlist using RSS feed
const https = require('https');

function fetchPlaylist(playlistId) {
    return new Promise((resolve, reject) => {
        // YouTube exposes playlist as RSS feed
        const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Extract video IDs from XML
                const videoIds = [];
                const titles = [];
                const idMatches = data.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g);
                const titleMatches = data.matchAll(/<media:title>([^<]+)<\/media:title>/g);
                
                for (const match of idMatches) {
                    videoIds.push(match[1]);
                }
                for (const match of titleMatches) {
                    titles.push(match[1]);
                }
                
                resolve({ videoIds, titles });
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    console.log('=== C Programming Playlist ===');
    const cData = await fetchPlaylist('PLU2wpJsXyAjnD1eXNVEHXFfRL2gShVEN5');
    console.log(`Found ${cData.videoIds.length} videos:`);
    cData.videoIds.forEach((id, i) => {
        console.log(`  ${i+1}. ${cData.titles[i] || 'Unknown'} => ${id}`);
    });

    console.log('\n=== Java Playlist ===');
    const jData = await fetchPlaylist('PLU2wpJsXyAjk0a--eMcRF3_47vIaL0Onj');
    console.log(`Found ${jData.videoIds.length} videos:`);
    jData.videoIds.forEach((id, i) => {
        console.log(`  ${i+1}. ${jData.titles[i] || 'Unknown'} => ${id}`);
    });
}

main().catch(console.error);
