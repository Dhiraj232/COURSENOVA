const http = require('http');

const req = http.request({
    host: '127.0.0.1',
    port: 5000,
    path: '/api/mocktest/categories',
    method: 'GET'
}, (res) => {
    console.log('STATUS:', res.statusCode);
    res.resume();
});

req.on('error', (e) => {
    console.log('Port 5000 is free (or closed):', e.message);
});

req.end();
