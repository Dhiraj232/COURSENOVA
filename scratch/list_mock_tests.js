const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('../models/MockTestPack');

async function findMockTests() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const packs = await MockTestPack.find({}, 'title');
        console.log('All mock test titles:');
        packs.forEach(p => console.log(p.title));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findMockTests();
