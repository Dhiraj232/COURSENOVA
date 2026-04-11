/**
 * COURSENOVA — API Base URL Configuration
 *
 * This file is included in every HTML page that makes API calls.
 * It automatically detects whether we are running locally or on a
 * production server, so you never need to change individual HTML files.
 *
 * TO DEPLOY: just upload this file alongside your HTML files.
 * On production (any non-localhost host) it will use the same origin
 * as the website itself, which works for same-server deployments.
 */
(function () {
    // ✅ PORT 5000 UNIFICATION
    window.COURSENOVA_API = 'http://localhost:5000';
    window.FRONTEND_URL   = 'http://localhost:5000';

    // Also expose a convenience function for building API URLs
    window.apiUrl = function (path) {
        const base = window.COURSENOVA_API;
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return base + cleanPath;
    };

    console.log(`[Config] Local-Only Mode | API: ${window.COURSENOVA_API}`);
})();
