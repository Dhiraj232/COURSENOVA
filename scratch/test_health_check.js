const http = require('http');
const serverFile = require('../server'); 

// We wait 2 seconds for the server and connection pool to fully initialize
setTimeout(() => {
    const port = process.env.PORT || 5000;
    
    // Warm-up request
    http.get(`http://localhost:${port}/health`, (warmupRes) => {
        warmupRes.on('data', () => {});
        warmupRes.on('end', () => {
            
            // Actual latency test
            const start = Date.now();
            http.get(`http://localhost:${port}/health`, (res) => {
                const duration = Date.now() - start;
                console.log(`HTTP Status Code: ${res.statusCode}`);
                console.log(`Latency: ${duration} ms`);
                
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log('Response Body:', body);
                    
                    if (res.statusCode === 200 && duration < 100) {
                        console.log('✅ HEALTH CHECK TEST PASSED: Returned HTTP 200 within 100 ms!');
                        process.exit(0);
                    } else {
                        console.error(`❌ HEALTH CHECK TEST FAILED: Status: ${res.statusCode}, Latency: ${duration} ms`);
                        process.exit(1);
                    }
                });
            }).on('error', (err) => {
                console.error('❌ Request error:', err.message);
                process.exit(1);
            });
            
        });
    }).on('error', (err) => {
        console.error('❌ Warm-up request error:', err.message);
        process.exit(1);
    });
}, 2000);
