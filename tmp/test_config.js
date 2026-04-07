const controller = require('./controllers/cashfreeController');
require('dotenv').config();

// Mock req/res
const req = {};
const res = {
    json: (data) => console.log('Config Response:', JSON.stringify(data))
};

console.log('Testing CF Config...');
controller.getCFConfig(req, res);
