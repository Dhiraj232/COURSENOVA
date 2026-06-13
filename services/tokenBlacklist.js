/**
 * services/tokenBlacklist.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory JWT Blacklist for active token revocation on user logout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const blacklistedTokens = new Map(); // token -> expiryTimestamp

module.exports = {
    /**
     * Add a token to the blacklist
     * @param {string} token 
     * @param {number} expirySeconds 
     */
    blacklistToken(token, expirySeconds) {
        if (!token) return;
        const expiryTimestamp = Date.now() + (expirySeconds * 1000);
        blacklistedTokens.set(token, expiryTimestamp);
        console.log(`[TokenBlacklist] Blacklisted token starting with "${token.slice(0, 10)}..." for ${expirySeconds}s.`);
    },

    /**
     * Check if a token has been blacklisted
     * @param {string} token 
     * @returns {boolean}
     */
    isBlacklisted(token) {
        if (!token) return false;
        const expiryTimestamp = blacklistedTokens.get(token);
        if (!expiryTimestamp) return false;

        // If current time exceeds expiry, remove from map and treat as not blacklisted
        if (Date.now() > expiryTimestamp) {
            blacklistedTokens.delete(token);
            return false;
        }
        return true;
    },

    /**
     * Periodically clean up expired tokens from the blacklist map
     */
    cleanup() {
        const now = Date.now();
        let count = 0;
        for (const [token, expiry] of blacklistedTokens.entries()) {
            if (now > expiry) {
                blacklistedTokens.delete(token);
                count++;
            }
        }
        if (count > 0) {
            console.log(`[TokenBlacklist] Cleaned up ${count} expired blacklisted tokens.`);
        }
    }
};

// Run garbage collection on the map every 30 minutes
setInterval(() => {
    try {
        module.exports.cleanup();
    } catch (err) {
        console.error('[TokenBlacklist] Cleanup interval error:', err.message);
    }
}, 30 * 60 * 1000);
