require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log(token);
