const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('../models/MockTestPack');

async function deleteMockTests() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/coursenova');
        console.log('Connected to MongoDB');

        const titlesToDelete = [
            "Bihar Board Class 12 (Commerce) Mock Tests",
            "CBSE Class 12 (Commerce) Mock Tests",
            "Punjab Board Class 10 Mock Tests",
            "Punjab Board Class 12 (Science) Mock Tests"
        ];

        for (const title of titlesToDelete) {
            const result = await MockTestPack.deleteMany({ title: title });
            console.log(`Deleted ${result.deletedCount} packs matching title: ${title}`);
        }

        console.log('Done deleting specified mock test packs.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

deleteMockTests();
