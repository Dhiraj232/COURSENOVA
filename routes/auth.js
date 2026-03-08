const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// @route   GET /auth/google
// @desc    Redirect to Google for authentication
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// @route   GET /auth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/signup.html?error=google_auth_failed',
        session: false
    }),
    (req, res) => {
        try {
            if (!req.user) {
                return res.redirect('/signup.html?error=user_not_found');
            }

            // Generate JWT Token
            const token = jwt.sign(
                {
                    userId: req.user._id,
                    role: req.user.role || 'student'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Prepare safe user object for frontend
            const userSafe = {
                id: req.user._id,
                fullName: req.user.name,
                email: req.user.email,
                role: req.user.role || 'student',
                picture: req.user.picture
            };

            const userStr = encodeURIComponent(JSON.stringify(userSafe));

            // Redirect back to frontend with token and user info
            // Ensure we redirect to the absolute root or specific page
            res.redirect(`/index.html?token=${token}&user=${userStr}`);
        } catch (error) {
            console.error('OAuth Callback Error:', error);
            res.redirect('/signup.html?error=server_error');
        }
    }
);

// @route   GET /api/me
// @desc    Get current user details from token
router.get('/me', async (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');

    if (!token) return res.status(401).json({ ok: false, message: 'Missing token' });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const User = require('../models/User');
        const user = await User.findById(payload.userId);

        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        res.json({
            ok: true,
            user: {
                id: user._id,
                fullName: user.name,
                email: user.email,
                role: user.role,
                college: user.collegeName,
                picture: user.picture,
                profileComplete: user.profileComplete
            }
        });
    } catch (err) {
        return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
});

module.exports = router;
