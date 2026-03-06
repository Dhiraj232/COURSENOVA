const mongoose = require('mongoose');
const User = require('./src/models/User');
const Book = require('./src/models/Book');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/store";

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB at", MONGO_URI);

        await User.deleteMany({});
        await Book.deleteMany({});
        console.log("Cleared old data.");

        const user = new User({
            googleId: "mock-google-id-123",
            email: "demo@student.com",
            name: "Demo Student",
            role: "student",
            collegeName: "Delhi University",
            city: "Delhi",
            location: {
                type: "Point",
                coordinates: [77.2090, 28.6139]
            },
            isOnboarded: true
        });

        await user.save();
        console.log("User created with ID:", user._id);

        const books = [
            {
                seller: user._id,
                title: "Introduction to Algorithms, 3rd Edition",
                subject: "Computer Science",
                condition: "Good",
                price: 450,
                images: ["https://via.placeholder.com/150?text=Algorithms"],
                collegeName: "Delhi University",
                location: user.location,
                status: "available"
            },
            {
                seller: user._id,
                title: "Operating Systems Concepts",
                subject: "Computer Science",
                condition: "Old",
                price: 300,
                images: ["https://via.placeholder.com/150?text=OS"],
                collegeName: "Delhi University",
                location: user.location,
                status: "available"
            }
        ];

        await Book.insertMany(books);
        console.log("Books created.");

    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

seed();
