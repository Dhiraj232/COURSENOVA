require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const MockTestPack = require('./models/MockTestPack');

async function makeAllFree() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI is missing');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Update all courses
        const courseUpdateResult = await Course.updateMany({}, {
            $set: {
                price: 0,
                isFree: true,
                isPremium: false
            }
        });
        console.log(`Updated ${courseUpdateResult.modifiedCount} Courses to be free.`);

        // Update all mock tests
        const mockTestUpdateResult = await MockTestPack.updateMany({}, {
            $set: {
                price: 0,
                isFree: true
            }
        });
        console.log(`Updated ${mockTestUpdateResult.modifiedCount} MockTestPacks to be free.`);

        console.log('Successfully made all content free!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

makeAllFree();
