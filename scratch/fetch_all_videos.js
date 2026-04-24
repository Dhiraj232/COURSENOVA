// Fetch ALL video IDs from YouTube playlist using multiple methods
const https = require('https');

function fetchWithInvidious(playlistId) {
    return new Promise((resolve, reject) => {
        // Use Invidious public API to get all playlist videos
        const url = `https://inv.nadeko.net/api/v1/playlists/${playlistId}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const videos = (json.videos || []).map((v, i) => ({
                        index: i + 1,
                        videoId: v.videoId,
                        title: v.title
                    }));
                    resolve(videos);
                } catch (e) {
                    reject(new Error('Failed to parse: ' + e.message));
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function fetchWithPiped(playlistId) {
    return new Promise((resolve, reject) => {
        const url = `https://pipedapi.kavin.rocks/playlists/${playlistId}`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const videos = (json.relatedStreams || []).map((v, i) => ({
                        index: i + 1,
                        videoId: v.url ? v.url.replace('/watch?v=', '') : '',
                        title: v.title
                    }));
                    resolve(videos);
                } catch (e) {
                    reject(new Error('Failed to parse: ' + e.message));
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    const playlists = [
        { name: 'C Programming', id: 'PLU2wpJsXyAjnD1eXNVEHXFfRL2gShVEN5' },
        { name: 'Java Placement', id: 'PLU2wpJsXyAjk0a--eMcRF3_47vIaL0Onj' }
    ];

    for (const pl of playlists) {
        console.log(`\n=== ${pl.name} (${pl.id}) ===`);
        let videos = [];
        
        try {
            console.log('Trying Invidious...');
            videos = await fetchWithInvidious(pl.id);
        } catch (e1) {
            console.log('Invidious failed:', e1.message);
            try {
                console.log('Trying Piped...');
                videos = await fetchWithPiped(pl.id);
            } catch (e2) {
                console.log('Piped failed:', e2.message);
            }
        }

        console.log(`Total videos: ${videos.length}`);
        videos.forEach(v => {
            console.log(`  ${v.index}. [${v.videoId}] ${v.title}`);
        });
    }
}

main().catch(console.error);
