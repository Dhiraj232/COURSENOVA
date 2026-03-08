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
        userId: req.user ? req.user.id || req.user._id : 'anonymous',
        body: req.method !== 'GET' ? req.body : undefined // Be careful with sensitive data here in production
    };

    console.warn(`⚠️ [SECURITY] ${reason} from ${req.ip} | User: ${logEntry.userId}`);

    const logDir = path.join(process.cwd(), 'logs');
    const logPath = path.join(logDir, 'security.log');

    try {
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch (err) {
        console.error('Failed to write to security log:', err);
    }
}

/**
 * Strict Rate Limiter for sensitive endpoints (Login, Signup, OTP)
 */
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per hour for sensitive routes
    message: {
        ok: false,
        message: "Too many attempts from this IP. Please try again after an hour. This incident has been logged."
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logSuspiciousActivity('Sensitive route rate limit exceeded', req);
        res.status(options.statusCode).send(options.message);
    }
});

/**
 * Middleware to check for common SQL Injection or NoSQL Injection patterns in body
 * (Basic demo implementation)
 */
function preventInjection(req, res, next) {
    const checkValue = (val) => {
        if (typeof val === 'string') {
            const pattern = /(\$ne|\$gt|\$lt|\$in|\$nin|\$exists|{.*:.*}|SELECT.*FROM|DROP\s+TABLE)/i;
            return pattern.test(val);
        }
        return false;
    };

    let suspect = false;
    if (req.body) {
        suspect = Object.values(req.body).some(checkValue);
    }
    if (req.query) {
        suspect = suspect || Object.values(req.query).some(checkValue);
    }

    if (suspect) {
        logSuspiciousActivity('Injection attempt detected', req);
        return res.status(403).json({ ok: false, message: 'Malicious content detected.' });
    }
    next();
}

module.exports = {
    logSuspiciousActivity,
    sensitiveLimiter,
    preventInjection
};
