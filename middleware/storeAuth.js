const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const StoreUser = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');

function readMainUsers() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; }
}

/**
 * Accepts BOTH:
 *  - Store JWT  (payload.storeUserId) — from old store google-auth
 *  - Main site JWT (payload.userId)   — from navbar login / signup
 *
 * For main-site tokens it auto-creates or finds the StoreUser by email.
 */
async function requireStoreAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (!token) return res.status(401).json({ ok: false, message: 'Login required' });

    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(401).json({ ok: false, message: 'Invalid or expired token' }); }

    try {
        // ── Case 1: store JWT ──────────────────────────────────────
        if (payload.storeUserId) {
            const user = await StoreUser.findById(payload.storeUserId);
            if (!user) return res.status(401).json({ ok: false, message: 'Store user not found' });
            req.storeUser = user;
            return next();
        }

        // ── Case 2: main-site JWT ─────────────────────────────────
        if (payload.userId) {
            let storeUser = await StoreUser.findById(payload.userId);
            if (!storeUser) {
                // Fallback: check mainUsers (users.json) for backwards compatibility/migration
                const mainUsers = readMainUsers();
                const mainUser = mainUsers.find(u => String(u.id) === String(payload.userId) || String(u._id) === String(payload.userId));
                if (mainUser) {
                    storeUser = await StoreUser.findOne({ email: mainUser.email });
                    if (!storeUser) {
                        storeUser = await StoreUser.create({
                            googleId: 'main_' + mainUser.id,   // synthetic — not a real Google ID
                            name: mainUser.fullName || 'User',
                            email: mainUser.email || '',
                            picture: mainUser.picture || ''
                        });
                    }
                }
            }

            if (!storeUser) return res.status(401).json({ ok: false, message: 'User not found' });
            
            req.storeUser = storeUser;
            return next();
        }

        return res.status(401).json({ ok: false, message: 'Unrecognized token format' });
    } catch (err) {
        console.error('StoreAuth error:', err);
        return res.status(500).json({ ok: false, message: 'Auth error' });
    }
}

/**
 * Middleware: Requires profile to be completed
 */
function requireProfile(req, res, next) {
    if (!req.storeUser.profileComplete) {
        return res.status(403).json({ ok: false, message: 'Profile setup required', needsProfile: true });
    }
    next();
}

module.exports = { requireStoreAuth, requireProfile };
