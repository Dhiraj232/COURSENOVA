/**
 * move_boards_to_paid.js
 * Moves the recently added State Board packs from Free to Paid.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        // Update packs that are "Board" related and currently free
        const result = await MockTestPack.updateMany(
            { 
                category: 'State Boards', 
                isFree: true,
                id: { $regex: /board/ } 
            }, 
            { 
                isFree: false, 
                price: 59 
            }
        );

        console.log(`🚀 Successfully moved ${result.modifiedCount} board packs to the Paid section.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Update failed:', err);
        process.exit(1);
    }
}

run();
