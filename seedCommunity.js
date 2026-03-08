const mongoose = require('mongoose');
const Post = require('./models/Post');
const Doubt = require('./models/Doubt');
const CommunityLeaderboard = require('./models/CommunityLeaderboard');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/renvox-bookstore';

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB for seeding community...');

    // Clear existing
    await Post.deleteMany({});
    await Doubt.deleteMany({});
    await CommunityLeaderboard.deleteMany({});

    // Get some users
    const users = await User.find().limit(5);
    if (!users.length) {
        console.log('No users found. Please sign up first.');
        process.exit(0);
    }

    // Seed Posts
    const posts = [
        {
            userId: users[0]._id,
            username: users[0].name,
            title: 'How to start with MERN Stack in 2025?',
            content: 'I want to build a career in Web Dev. Is MERN still the best choice or should I look at Next.js?',
            category: 'Web Dev',
            likesCount: 15,
            commentsCount: 5,
            views: 120
        },
        {
            userId: users[1]._id,
            username: users[1].name,
            title: 'Best Resources for DSA?',
            content: 'Which platform is best for practicing DSA? LeetCode, GFG, or RENVOX Practice Hub?',
            category: 'DSA',
            likesCount: 25,
            commentsCount: 12,
            views: 450
        }
    ];
    await Post.insertMany(posts);

    // Seed Doubts
    const doubts = [
        {
            userId: users[0]._id,
            username: users[0].name,
            question: 'How does binary search work?',
            details: 'I am confused between iterative and recursive approach.',
            answers: [
                {
                    username: 'Instructor Aman',
                    answer: 'Binary search works by repeatedly dividing the sorted search interval in half. Use the middle element to decide which half to discard.',
                    isInstructor: true
                }
            ]
        }
    ];
    await Doubt.insertMany(doubts);

    // Seed Leaderboard
    for (let u of users) {
        await CommunityLeaderboard.create({
            userId: u._id,
            username: u.name,
            points: Math.floor(Math.random() * 500),
            posts: Math.floor(Math.random() * 10),
            answers: Math.floor(Math.random() * 20)
        });
    }

    console.log('Community data seeded successfully!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
