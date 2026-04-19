require('dotenv').config();
const mongoose = require('mongoose');
const MockTestPack = require('./models/MockTestPack');

async function cleanupStateBoards() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova');
        console.log("MongoDB Connected!");

        // 1. Hard delete the specified packs
        const packsToDelete = [
            "Punjab Board Class 12 (Arts) Free Mock Tests",
            "Punjab Board Class 12 (Commerce) Free Mock Tests",
            "UP Board Class 12 (Commerce) Free Mock Tests"
        ];

        console.log(`Deleting specific packs: \n${packsToDelete.join('\n')}`);
        
        const deleteResult = await MockTestPack.deleteMany({ title: { $in: packsToDelete } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} packs successfully.`);

        // 2. Remove 'Free' from the titles of remaining State Board packs
        console.log("Renaming remaining State Board packs to remove the word 'Free'...");
        
        const stateBoardPacks = await MockTestPack.find({ category: 'State Board' });
        
        let renameCount = 0;
        for (const pack of stateBoardPacks) {
            if (pack.title.includes(' Free ')) {
                const oldTitle = pack.title;
                pack.title = pack.title.replace(' Free ', ' ');
                // Also optionally clean up description
                if (pack.description && pack.description.includes(' free ')) {
                    pack.description = pack.description.replace(' free ', ' ');
                }
                await pack.save();
                console.log(`Renamed: "${oldTitle}" -> "${pack.title}"`);
                renameCount++;
            }
        }
        
        console.log(`✅ Renamed ${renameCount} State Board packs successfully.`);
        
        console.log("\n🎉 State Board Cleanup Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("Error during cleanup:", error);
        process.exit(1);
    }
}

cleanupStateBoards();
