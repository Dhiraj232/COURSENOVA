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
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // ✅ DYNAMIC UNIFICATION
    window.COURSENOVA_API = '';
    window.FRONTEND_URL   = window.location.origin;

    // Also expose a convenience function for building API URLs
    window.apiUrl = function (path) {
        const base = window.COURSENOVA_API;
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return base + cleanPath;
    };

    console.log(`[Config] ${isLocal ? 'Local Development' : 'Production'} Mode | API: ${window.COURSENOVA_API || 'Relative'}`);
})();
