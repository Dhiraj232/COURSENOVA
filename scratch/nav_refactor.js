/**
 * ==================== COURSENOVA NAVIGATION SYSTEM ====================
 * handles all navigation, auth redirects, and user state sync.
 */

// 1. AUTH HELPERS
function getAuthToken() {
    return localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
}

function getAuthUser() {
    const userStr = localStorage.getItem('coursenova_user') || localStorage.getItem('coursenovaUser');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

/**
 * ─── Sync User State ──────────────────────────────────────────────────
 * Top-level function accessible globally.
 */
async function refreshUserData() {
    const token = getAuthToken();
    if (!token) return;

    try {
        console.log('🔄 [Auth] Refreshing user data...');
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && data.user) {
            localStorage.setItem('coursenovaUser', JSON.stringify(data.user));
            localStorage.setItem('coursenova_user', JSON.stringify(data.user));
            console.log('✅ [Auth] Data synchronized');
            return data.user;
        }
    } catch (e) {
        console.error('❌ [Auth] Refresh failed:', e);
    }
    return null;
}

/**
 * ─── OAuth Redirect Handler ───────────────────────────────────────────
 */
function handleAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userStr = urlParams.get('user');
    const logout = urlParams.get('logout');

    if (logout === 'true' || logout === 'success') {
        showGlobalToast('Logged out successfully', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (token && userStr) {
        try {
            localStorage.setItem('coursenovaToken', token);
            localStorage.setItem('coursenova_token', token);
            localStorage.setItem('coursenovaUser', userStr);
            localStorage.setItem('coursenova_user', userStr);

            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ [Auth] Session established via OAuth');

            refreshUserData();
            if (typeof setupUserDropdown === 'function') setupUserDropdown();
        } catch (error) {
            console.error('❌ [Auth] Redirect Error:', error);
        }
    }
}

// Global initialization
handleAuthRedirect();

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupMobileMenu();
    setupScrollEffects();
    setupHashNavigation();
    setupUserDropdown();
    setupNavbarSearch();
});

// ... [Remainder of navigation logic will be preserved in a multi-replace if possible, or I'll just rewrite the file] ...
// Given the file is 763 lines, I'll use multi-replace to fix the top section.
