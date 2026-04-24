const https = require('https');

function searchPiped(query) {
    return new Promise((resolve, reject) => {
        const url = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=playlists`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.items);
                } catch (e) { reject(e); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function searchPipedVideos(query) {
    return new Promise((resolve, reject) => {
        const url = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`;
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.items);
                } catch (e) { reject(e); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    console.log('Searching for playlists...');
    const plData = await searchPiped('rajonlinetrainings MySQL');
    if (plData && plData.length) {
        plData.slice(0, 5).forEach(p => {
            console.log(`Playlist: ${p.title} (${p.uploaderName}) -> ${p.url}`);
        });
    } else {
        console.log('No playlists found.');
    }

    console.log('\nSearching for videos...');
    const vData = await searchPipedVideos('rajonlinetrainings MySQL Tutorial');
    if (vData && vData.length) {
        vData.slice(0, 15).forEach(v => {
            console.log(`Video: ${v.title} (${v.uploaderName}) -> ${v.url}`);
        });
    }
}

main().catch(console.error);
