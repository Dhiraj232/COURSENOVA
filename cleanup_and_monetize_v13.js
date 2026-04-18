const mongoose = require('mongoose');
require('dotenv').config();

const MockTestPack = require('./models/MockTestPack');

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 1. Delete legacy premium packs
        // We only want to keep 'State Board', 'Govt Exam', 'National Exam'
        const allowedCategories = ['CBSE Board', 'ICSE Board', 'State Board', 'Govt Exam', 'National Exam'];
        
        console.log('🗑️ Deleting legacy mock packs not in allowed categories...');
        const deleteRes = await MockTestPack.deleteMany({
            category: { $nin: allowedCategories }
        });
        console.log(`✅ Deleted ${deleteRes.deletedCount} legacy packs.`);

        // 2. Monetize remaining packs
        console.log('💰 Monetizing all remaining packs (randomizing price ₹59 - ₹129)...');
        const packs = await MockTestPack.find({ category: { $in: allowedCategories } });
        
        for (const pack of packs) {
            const randomPrice = Math.floor(Math.random() * (129 - 59 + 1)) + 59;
            pack.isFree = false;
            pack.price = randomPrice;
            await pack.save();
            console.log(`   - [${pack.category}] ${pack.title} -> ₹${randomPrice}`);
        }

        console.log('\n✨ MONETIZATION & CLEANUP COMPLETE!');
        console.log(`   - Processed ${packs.length} packs.`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
