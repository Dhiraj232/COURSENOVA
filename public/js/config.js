/**
 * RENVOX AI — API Base URL Configuration
 *
 * This file is included in every HTML page that makes API calls.
 * It automatically detects whether we are running locally or on a
 * production server, so you never need to change individual HTML files.
 *
 * TO DEPLOY: just upload this file alongside your HTML files.
 * On production (any non-localhost host) it will use the same origin
 * as the website itself, which works for same-server deployments.
 *
 * For a separate API server, change the production URL below:
 *   const PRODUCTION_API = 'https://api.yoursite.com';
 */
(function () {
<<<<<<< HEAD
    const PRODUCTION_API = ''; // Leave empty for same-origin. Set to 'https://api.yourdomain.com' if API is on a different server.
=======
    const PRODUCTION_API = 'https://renvox-ai.onrender.com';
>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.RENVOX_API = 'http://localhost:5000';
    } else {
<<<<<<< HEAD
        window.RENVOX_API = PRODUCTION_API || window.location.origin;
=======
        window.RENVOX_API = PRODUCTION_API;
>>>>>>> 50e7be1d013f899c684d287b975c9092d691640c
    }

    // Also expose a convenience function for building API URLs
    window.apiUrl = function (path) {
        return window.RENVOX_API + (path.startsWith('/') ? path : '/' + path);
    };
})();
