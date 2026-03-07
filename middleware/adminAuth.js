const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin_secret_change_me';

/**
 * adminAuth — blocks access unless the request carries a valid admin JWT.
 * Admin tokens are issued by POST /api/admin/login.
 */
function adminAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Admin authentication required.' });
    }

    try {
        const payload = jwt.verify(token, ADMIN_JWT_SECRET);
        if (!payload.isAdmin) {
            return res.status(403).json({ ok: false, message: 'Access denied. Admin only.' });
        }
        req.adminId = payload.adminId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ ok: false, message: 'Admin session expired. Please log in again.' });
        }
        return res.status(401).json({ ok: false, message: 'Invalid admin token.' });
    }
}

module.exports = { adminAuth };
