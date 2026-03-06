const mongoose = require('mongoose');

async function checkDatabase() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/store', {
            serverSelectionTimeoutMS: 5000
        });
        console.log("Connected to MongoDB");

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);

        for (let col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`- Collection: ${col.name}, Documents: ${count}`);

            if (count > 0) {
                const sample = await mongoose.connection.db.collection(col.name).findOne();
                console.log(`  Sample: ${JSON.stringify(sample).substring(0, 100)}...`);
            }
        }

    } catch (err) {
        console.error("Error connecting or reading DB:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkDatabase();
