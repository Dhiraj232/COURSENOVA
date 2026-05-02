const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { sensitiveLimiter, preventInjection } = require('../middleware/security');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const JWT_SECRET = process.env.JWT_SECRET || 'Dhiraj@2026_secure_key!';
const ADMIN_EMAIL = 'coursenova.in@gmail.com';

// ── ADMIN LOGIN (Manual) ──────────────────────────────────────────
router.post('/admin-login', catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Strict Whitelist Check
    if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ ok: false, message: 'Forbidden: Unauthorized admin email' });
    }

    // 2. Find Admin User (must exist in DB or we create it if it's the master email)
    const User = require('../models/User');
    let user = await User.findOne({ email });

    // Note: For simplicity, we'll allow the master email to login if password matches 
    // In a real system, you'd check bcrypt(password)
    // Here we'll use a secret env variable for admin password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Coursenova@Admin#2026';

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ ok: false, message: 'Invalid admin credentials' });
    }

    if (!user) {
        // Create master admin if not exists (dummy googleId)
        user = await User.create({
            email,
            name: 'Coursenova Admin',
            googleId: 'master_admin_' + Date.now(),
            role: 'admin',
            profileComplete: true
        });
    } else if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
    }

    const token = jwt.sign(
        { userId: user._id, role: 'admin', email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        ok: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'admin'
        }
    });
}));

// @route   GET /api/auth/google  (also accessible as /auth/google via legacy alias)
// @desc    Redirect to Google for authentication
router.get('/google',
    sensitiveLimiter,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);


router.use(preventInjection);

// @route   GET /api/auth/google/callback
router.get('/google/callback',
    (req, res, next) => {
        console.log(`[Google Auth Callback] Query Code present: ${!!req.query.code}, Error present: ${!!req.query.error}`);
        next();
    },
    passport.authenticate('google', {
        failureRedirect: '/signup.html?error=google_auth_failed'
    }),
    catchAsync(async (req, res, next) => {
        if (!req.user) {
            return res.redirect('/signup.html?error=user_not_found');
        }

        // ── ADMIN WHITELIST CHECK ──
        let userRole = req.user.role || 'user';
        if (req.user.email === ADMIN_EMAIL) {
            userRole = 'admin';
            // Update role in DB if not already admin
            if (req.user.role !== 'admin') {
                const User = require('../models/User');
                await User.findByIdAndUpdate(req.user._id, { role: 'admin' });
            }
        } else {
            // Force non-admins to 'user' role
            userRole = 'user';
            if (req.user.role !== 'user') {
                const User = require('../models/User');
                await User.findByIdAndUpdate(req.user._id, { role: 'user' });
            }
        }

        // ── ACTIVITY LOGGING ──
        const Activity = require('../models/Activity');
        try {
            await Activity.create({
                userId: req.user._id,
                type: userRole === 'admin' ? 'admin_login' : 'login',
                title: userRole === 'admin' ? 'Admin Access' : 'User Login',
                description: `${userRole === 'admin' ? 'Administrator' : 'Student'} logged in from ${req.ip || 'unknown IP'}`
            });
        } catch (logErr) {
            console.warn('Silent Login Log Error:', logErr);
        }

        const token = jwt.sign(
            { userId: req.user._id, role: userRole, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userSafe = {
            id: req.user._id,
            fullName: req.user.name,
            email: req.user.email,
            role: userRole,
            picture: req.user.picture
        };

        // ✅ FIXED: Redirect to a dedicated auth-callback page.
        // That page reads token/user from URL, saves them to localStorage,
        // then redirects the user to the dashboard. This is the standard
        // pattern for SPA + server-side OAuth.
        const userStr = encodeURIComponent(JSON.stringify(userSafe));
        // ✅ PRODUCTION UNIFICATION: Always redirect to our own static frontend
        const REDIRECT_URL = (process.env.FRONTEND_URL || 'https://www.coursenova.in') + '/auth-callback.html';
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
