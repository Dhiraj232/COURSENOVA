const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * requireAuth — protect any route that needs a logged-in user.
 * Attaches req.userId and req.user to the request.
 * Returns 401 if no token or token is invalid/expired.
 */
function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.cookies && req.cookies.token ? req.cookies.token : '');

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Authentication required. Please log in.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.userId || payload.id;
        req.user = payload;
        if (req.user) {
            req.user.id = req.userId;
            req.userEmail = payload.email || '';
            req.userName = payload.name || '';
            req.userRole = payload.role || '';
        }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ ok: false, message: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ ok: false, message: 'Invalid token. Please log in again.' });
    }
}

/**
 * optionalAuth — attaches user if token present, but does NOT block if missing.
 * Useful for public routes that show extra info when logged in.
 */
function optionalAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.userId = payload.userId || payload.id;
            req.user = payload;
            if (req.user) {
                req.user.id = req.userId;
                req.userEmail = payload.email || '';
                req.userName = payload.name || '';
                req.userRole = payload.role || '';
            }
        } catch {
            // Token invalid — just skip, treat as unauthenticated
        }
    }
    next();
}

/**
 * requireAdmin — protect routes that specifically need admin privileges.
 */
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ ok: false, message: 'Access denied. Admin privileges required.' });
        }
    });
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
