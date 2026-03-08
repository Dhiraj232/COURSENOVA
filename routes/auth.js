const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { sensitiveLimiter, preventInjection } = require('../middleware/security');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// @route   GET /auth/google
// @desc    Redirect to Google for authentication
router.get('/google',
    sensitiveLimiter,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.use(preventInjection);

// @route   GET /auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/signup.html?error=google_auth_failed'
    }),
    catchAsync(async (req, res, next) => {
        if (!req.user) {
            return res.redirect('/signup.html?error=user_not_found');
        }

        // ── ACTIVITY LOGGING ──
        const Activity = require('../models/Activity');
        try {
            await Activity.create({
                userId: req.user._id,
                type: 'login',
                title: 'User Login',
                description: `Student logged in from ${req.ip || 'unknown IP'}`
            });
        } catch (logErr) {
            console.warn('Silent Login Log Error:', logErr);
        }

        const token = jwt.sign(
            { userId: req.user._id, role: req.user.role || 'student' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userSafe = {
            id: req.user._id,
            fullName: req.user.name,
            email: req.user.email,
            role: req.user.role || 'student',
            picture: req.user.picture
        };

        const userStr = encodeURIComponent(JSON.stringify(userSafe));
        res.redirect(`/dashboard?token=${token}&user=${userStr}`);
    })
);

// @route   GET /api/me
router.get('/me', catchAsync(async (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.token || '');

    if (!token) return next(new AppError('Missing authentication token', 401));

    const payload = jwt.verify(token, JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findById(payload.userId);

    if (!user) return next(new AppError('Student account not found', 404));

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
}));

// @route   GET /auth/logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(new AppError('Logout process failed', 500));

        if (req.session) {
            req.session.destroy((err) => {
                if (err) return next(new AppError('Session cleanup failed', 500));

                const cookiesToClear = ['connect.sid', 'token', 'user', 'renvox_token'];
                cookiesToClear.forEach(cookie => res.clearCookie(cookie));

                res.json({ success: true, message: 'Logged out completely' });
            });
        } else {
            res.json({ success: true, message: 'No active session' });
        }
    });
});

module.exports = router;
