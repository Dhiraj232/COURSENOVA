Object.keys(process.env).forEach(key => {
    if (key.includes('GEMINI') || key.includes('GOOGLE') || key.includes('API') || key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('CRED')) {
        console.log(`${key}: ${process.env[key] ? process.env[key].substring(0, 10) + '...' : 'undefined'}`);
    }
});
