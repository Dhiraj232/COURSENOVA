const dotenv = require('dotenv');
// 🔥 Load environment variables from the local .env file
// Use __dirname so the path is correct irrespective of cwd
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./config/db');

// DB connect
connectDB();

// Passport config
require('./config/passport');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

// 🔐 Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// 🔐 Passport
app.use(passport.initialize());
app.use(passport.session());

// ==================
// 🔑 GOOGLE AUTH ROUTES
// ==================
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: `${process.env.FRONTEND_URL}`,
        failureRedirect: '/login'
    })
);

// ==================
// API ROUTES
// ==================
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'Store API is running!' });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});