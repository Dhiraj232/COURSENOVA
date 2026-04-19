require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/Post');
const User = require('./models/User');
const Comment = require('./models/Comment');

const demoUsers = [
    { name: 'Kavita Singh', email: 'kavita@demo.com', role: 'student', password: 'password', googleId: 'g_123', picture: 'https://ui-avatars.com/api/?name=Kavita+Singh&background=random' },
    { name: 'Rohan Sharma', email: 'rohan@demo.com', role: 'student', password: 'password', googleId: 'g_124', picture: 'https://ui-avatars.com/api/?name=Rohan+Sharma&background=random' },
    { name: 'Priya Patel', email: 'priya@demo.com', role: 'student', password: 'password', googleId: 'g_125', picture: 'https://ui-avatars.com/api/?name=Priya+Patel&background=random' },
    { name: 'Aditya Verma', email: 'aditya@demo.com', role: 'student', password: 'password', googleId: 'g_126', picture: 'https://ui-avatars.com/api/?name=Aditya+Verma&background=random' },
    { name: 'Neha Gupta', email: 'neha@demo.com', role: 'student', password: 'password', googleId: 'g_127', picture: 'https://ui-avatars.com/api/?name=Neha+Gupta&background=random' }
];

const mockPosts = [
    { title: 'Best resources for practicing DSA?', content: 'I am struggling with Dynamic Programming. What are the best free resources or channels to follow?', category: 'DSA', tags: ['dsa', 'dp', 'help'] },
    { title: 'Is MERN stack still relevant in 2026?', content: 'Everyone is talking about Next.js and AI tools. Should a beginner still learn the classic MERN stack?', category: 'Web Dev', tags: ['webdev', 'mern', 'career'] },
    { title: 'How to maintain consistency in JEE preparation?', content: 'I study for 10 hours for 2 days and then get burnt out for the next 3 days. Any tips on maintaining a steady flow?', category: 'Career', tags: ['jee', 'consistency', 'tips'] },
    { title: 'Understanding pointers in C++', content: 'Can someone explain pointers in simple terms? I keep getting segmentation faults in my assignments.', category: 'Programming', tags: ['cpp', 'pointers', 'help'] },
    { title: 'React vs Angular for getting a job quickly', content: 'Which framework has more entry level jobs right now? I need to build projects quickly to get hired.', category: 'Web Dev', tags: ['react', 'angular', 'jobs'] },
    { title: 'Tips for scoring good in CBSE board exams', content: 'What is the ideal way to write subjective answers in Science to get maximum marks?', category: 'Career', tags: ['cbse', 'boards', 'tips'] }
];

const mockComments = [
    "I highly recommend Neetcode and Striver's A2Z sheet!",
    "Consistency is key. Don't aim for 10 hours, aim for 4 hours daily without fail.",
    "MERN is totally relevant, but learn Next.js right after React.",
    "Think of a pointer as a variable that stores an address, not a value.",
    "Practice is the only way to get better. Build out some projects.",
    "Focus on previous year papers, they repeat a lot!"
];

async function seedCommunity() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coursenova');
        console.log('Connected to DB');

        // Create Demo Users
        const createdUsers = [];
        for (const uInfo of demoUsers) {
            let u = await User.findOne({ email: uInfo.email });
            if (!u) {
                u = await User.create(uInfo);
            }
            createdUsers.push(u);
        }

        console.log(`Verified ${createdUsers.length} dummy users.`);

        // Create some posts
        for (const postInfo of mockPosts) {
            const author = createdUsers[Math.floor(Math.random() * createdUsers.length)];
            const post = await Post.create({
                userId: author._id,
                username: author.name,
                userPicture: author.picture,
                title: postInfo.title,
                content: postInfo.content,
                category: postInfo.category,
                tags: postInfo.tags,
                likesCount: Math.floor(Math.random() * 20),
                views: Math.floor(Math.random() * 100)
            });

            // Randomly assign likes
            const numLikes = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numLikes; i++) {
                const liker = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                if (!post.likes.includes(liker._id)) {
                    post.likes.push(liker._id);
                }
            }
            await post.save();

            // Randomly create comments
            const numComments = Math.floor(Math.random() * 3);
            for (let c = 0; c < numComments; c++) {
                const commenter = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                const text = mockComments[Math.floor(Math.random() * mockComments.length)];
                await Comment.create({
                    postId: post._id,
                    userId: commenter._id,
                    username: commenter.name,
                    userPicture: commenter.picture,
                    content: text
                });
                post.commentsCount += 1;
            }
            await post.save();
        }

        console.log("✅ Seeded community with organic posts and comments!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedCommunity();
