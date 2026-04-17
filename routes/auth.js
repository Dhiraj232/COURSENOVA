const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { sensitiveLimiter, preventInjection } = require('../middleware/security');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';

// @route   GET /api/auth/google  (also accessible as /auth/google via legacy alias)
// @desc    Redirect to Google for authentication
router.get('/google',
    sensitiveLimiter,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);


router.use(preventInjection);

// @route   GET /api/auth/google/callback
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

        // ✅ FIXED: Redirect to a dedicated auth-callback page.
        // That page reads token/user from URL, saves them to localStorage,
        // then redirects the user to the dashboard. This is the standard
        // pattern for SPA + server-side OAuth.
        const userStr = encodeURIComponent(JSON.stringify(userSafe));
        // ✅ PRODUCTION UNIFICATION: Always redirect to our own static frontend
        const REDIRECT_URL = 'https://coursenova.in/auth-callback.html';
        res.redirect(`${REDIRECT_URL}?token=${token}&user=${userStr}`);
    })
);

// @route   GET /api/auth/me  (also GET /auth/me via legacy alias)
// @desc    Returns current logged-in user from JWT token
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
            profileComplete: user.profileComplete,
            purchasedCourses: user.purchasedCourses || [],
            purchasedMockTest: user.purchasedMockTest || false,
            enrolledCourses: user.enrolledCourses || [],
            hasMockSeriesAccess: user.hasMockSeriesAccess || false
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

                const cookiesToClear = ['connect.sid', 'token', 'user', 'coursenova_token'];
                cookiesToClear.forEach(cookie => res.clearCookie(cookie));

                res.json({ success: true, message: 'Logged out completely' });
            });
        } else {
            res.json({ success: true, message: 'No active session' });
        }
    });
});

module.exports = router;
