const https = require('https');

function fetchWithInvidious(playlistId) {
    return new Promise((resolve, reject) => {
        const url = `https://inv.nadeko.net/api/v1/playlists/${playlistId}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('Title:', json.title);
                    console.log('Author:', json.author);
                    console.log('Video count:', json.videoCount);
                    const videos = (json.videos || []).map((v, i) => ({
                        index: i + 1,
                        videoId: v.videoId,
                        title: v.title
                    }));
                    resolve(videos);
                } catch (e) { reject(e); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Try multiple possible MySQL playlist IDs from Raj Technologies
const candidates = [
    'PLU2wpJsXyAjmN-e_yRiPHVLZmArgdHL9',
    'PLU2wpJsXyAjndL5y7tY2bPIqJ1g-D_Q7',
    'PLU2wpJsXyAjkHarViTQuZQGr0j1sPcenl',
];

async function main() {
    // First search channel for MySQL playlist
    const channelUrl = `https://inv.nadeko.net/api/v1/channels/UCQTiMFCrhSg-0ZxjJfyEoag/playlists`;
    
    const channelData = await new Promise((resolve, reject) => {
        https.get(channelUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });

    console.log('Channel playlists found:', channelData.playlists ? channelData.playlists.length : 0);
    if (channelData.playlists) {
        channelData.playlists.forEach(p => {
            if (p.title && p.title.toLowerCase().includes('mysql')) {
                console.log(`\n>>> FOUND MySQL: ${p.title} => ${p.playlistId}`);
            }
            if (p.title && (p.title.toLowerCase().includes('sql') || p.title.toLowerCase().includes('database'))) {
                console.log(`  SQL/DB: ${p.title} => ${p.playlistId}`);
            }
        });
    }
}

main().catch(console.error);
