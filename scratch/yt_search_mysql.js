const ytSearch = require('yt-search');

async function main() {
    console.log('Searching for Raj Technologies MySQL Videos...');
    const r = await ytSearch('MySQL Tutorial for Beginners Raj Technologies');
    const videos = r.videos || [];
    
    videos.filter(v => v.author.name.toLowerCase().includes('raj')).forEach((v, i) => {
        console.log(`{ lessonId: 'mysql-l${i+1}', title: '${v.title.replace(/'/g, "\\'")}', videoUrl: 'https://www.youtube.com/embed/${v.videoId}?rel=0', pdfUrl: '', order: ${i+1} },`);
    });
}

main().catch(console.error);
