const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

/**
 * Suspicious Activity Logger
 * Logs potentially malicious requests to a secure file and console.
 */
function logSuspiciousActivity(reason, req) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        reason: reason,
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('user-agent'),
        userId: req.user ? req.user.id || req.user._id : 'anonymous'
        // NOTE: req.body intentionally excluded here to avoid logging credentials
    };

    console.warn(`⚠️ [SECURITY] ${reason} from ${req.ip} | User: ${logEntry.userId}`);

    const logDir = path.join(process.cwd(), 'logs');
    const logPath = path.join(logDir, 'security.log');

    try {
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
        console.error('Failed to write to security log:', err);
    }
}

/**
 * Strict Rate Limiter for sensitive auth endpoints (Login, Signup, OTP, Google Auth)
 * 10 attempts per 15 minutes per IP
 */
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        ok: false,
        message: "Too many login attempts from this IP. Please wait 15 minutes before trying again."
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logSuspiciousActivity('Auth rate limit exceeded', req);
        res.status(options.statusCode).send(options.message);
    }
});

/**
 * Payment endpoint rate limiter — stricter to prevent payment abuse
 * 20 attempts per hour per IP
 */
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
        ok: false,
        message: "Too many payment requests from this IP. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logSuspiciousActivity('Payment rate limit exceeded', req);
        res.status(options.statusCode).send(options.message);
    }
});

/**
 * Middleware to check for common SQL Injection or NoSQL Injection patterns in body and query
 * This is a defence-in-depth layer (mongoSanitize already strips $operators)
 */
function preventInjection(req, res, next) {
    const SQL_NOSQL_PATTERN = /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$where|\$regex)/i;

    const checkValue = (val) => {
        if (typeof val === 'string') return SQL_NOSQL_PATTERN.test(val);
        if (typeof val === 'object' && val !== null) {
            return Object.values(val).some(v => checkValue(v));
        }
        return false;
    };

    let suspect = false;
    if (req.body && typeof req.body === 'object') {
        suspect = Object.values(req.body).some(checkValue);
    }
    if (req.query && typeof req.query === 'object') {
        suspect = suspect || Object.values(req.query).some(checkValue);
    }

    if (suspect) {
        logSuspiciousActivity('Injection attempt detected', req);
        return res.status(403).json({ ok: false, message: 'Malicious content detected. This incident has been logged.' });
    }
    next();
}

module.exports = {
    logSuspiciousActivity,
    sensitiveLimiter,
    paymentLimiter,
    preventInjection
};
