/**
 * ==================== COURSENOVA NAVIGATION SYSTEM ====================
 * 
 * This file handles all navigation functionality across the entire platform
 * Features:
 * - Active link highlighting based on current page
 * - Smooth page navigation with JavaScript
 * - Hash-based navigation on homepage
 * - Responsive mobile menu handling
 * 
 * @author COURSENOVA Development Team
 * @version 1.1.0
 */

// 0. DOMAIN ENFORCEMENT (Canonical URL)
// This ensures that user sessions (localStorage) are consistent by forcing the www subdomain.
(function loadPerformanceEngine() {
    if (document.getElementById('coursenova-performance-engine')) return;
    const script = document.createElement('script');
    script.id = 'coursenova-performance-engine';
    script.src = '/js/performance.js';
    script.defer = true;
    document.head.appendChild(script);
})();

(function enforceCanonicalDomain() {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('coursenova.in');
    
    if (isProduction && hostname === 'coursenova.in') {
        console.warn('🔄 Redirecting to canonical domain (www.coursenova.in) to ensure session persistence...');
        window.location.replace('https://www.coursenova.in' + window.location.pathname + window.location.search + window.location.hash);
    }
})();

// 1. AUTH HELPERS
/**
 * Safely get the auth token from localStorage (standardized)
 * @returns {string|null} The token or null
 */
function getAuthToken() {
    // Migration check
    const oldToken = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
    if (oldToken && !localStorage.getItem('token')) {
        localStorage.setItem('token', oldToken);
        localStorage.removeItem('coursenovaToken');
        localStorage.removeItem('coursenova_token');
    }
    return localStorage.getItem('token');
}

/**
 * Safely get the user object from localStorage
 * @returns {object|null} The user object or null
 */
function getAuthUser() {
    const oldUser = localStorage.getItem('coursenovaUser') || localStorage.getItem('coursenova_user');
    if (oldUser && !localStorage.getItem('user')) {
        localStorage.setItem('user', oldUser);
        localStorage.removeItem('coursenovaUser');
        localStorage.removeItem('coursenova_user');
    }
    const userStr = localStorage.getItem('user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

handleAuthRedirect();

document.addEventListener('DOMContentLoaded', function () {
    setupNavigation();
    setupMobileMenu();
    setupScrollEffects();
    setupHashNavigation();
    setupUserDropdown(); // Fixed function name

    // ── Auto-load Notification Center (injects bell icon + panel on all pages) ──
    loadNotificationSystem();
});

// ==================== 2. DETECT CURRENT PAGE ====================
/**
 * Get the current page filename
 * @returns {string} Current page name (e.g., 'index', 'subjects', 'practice')
 */
function getCurrentPage() {
    const pathname = window.location.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename.replace('.html', '') || 'index';
}

// ==================== 3. SETUP ACTIVE LINK HIGHLIGHTING ====================
/**
 * Setup navigation and highlight active link based on current page
 */
function setupNavigation() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;

    const links = [
        { name: 'Courses', href: 'certificates', key: 'courses' },
        { name: 'Mock Tests', href: 'mock-tests', key: 'tests' },
        { name: 'Daily Challenge <span class="nav-badge" style="background:#ef4444;color:white;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;vertical-align:top;font-weight:700;">NEW 🔥</span>', href: 'daily-challenge', key: 'daily-challenge' },
        { name: 'Store', href: 'store', key: 'store' },
        { name: 'College', href: '#', key: 'college', dropdown: [
            { name: 'CGPA Calculator', href: 'cgpa-calculator' },
            { name: 'University Mock Tests', href: 'mock-tests' },
            { name: 'Syllabus & Notes', href: 'store' },
            { name: 'Campus Community', href: 'community' }
        ] },
        { name: 'About', href: 'about', key: 'about' }
    ];

    const currentPage = getCurrentPage();

    // Inject normalized links
    navMenu.innerHTML = links.map(link => {
        let isActive = (link.href === currentPage) || (link.href === '/' && currentPage === 'index');
        
        if (link.dropdown) {
            // Check if any dropdown item is active
            const isDropdownActive = link.dropdown.some(d => d.href === currentPage || (currentPage === 'my-certificates' && d.href === 'certificates'));
            
            let dropdownHtml = `<li class="nav-dropdown">
                <a href="${link.href}" class="nav-dropdown-toggle ${isDropdownActive ? 'active' : ''}">${link.name} <i class="fas fa-chevron-down ChevronIcon"></i></a>
                <ul class="nav-dropdown-menu">`;
            
            link.dropdown.forEach(d => {
                let isSubActive = (d.href === currentPage) || (currentPage === 'my-certificates' && d.href === 'certificates');
                dropdownHtml += `<li><a href="${d.href}" class="${isSubActive ? 'active' : ''}">${d.name}</a></li>`;
            });
            
            dropdownHtml += `</ul></li>`;
            return dropdownHtml;
        } else {
            // Specific active rules
            if (currentPage === 'mock-tests' && link.href === 'mock-tests') isActive = true;

            return `<li><a href="${link.href}" class="${isActive ? 'active' : ''}">${link.name}</a></li>`;
        }
    }).join('');

    // Update enrollment count badge if logged in
    updateEnrollmentBadge();

    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) return; // handled by hash scroll
            e.preventDefault();
            navigateToPage(href);
        });
    });

    // Mobile dropdown toggle click handler
    const dropdownToggles = navMenu.querySelectorAll('.nav-dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                const parent = this.closest('.nav-dropdown');
                parent.classList.toggle('active-mobile');
                
                // Toggle chevron rotation
                const icon = this.querySelector('.ChevronIcon');
                if (icon) {
                    if (parent.classList.contains('active-mobile')) {
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        icon.style.transform = 'none';
                    }
                }
            }
        });
    });
}

/**
 * Fetch and display the enrollment count next to "Courses" link
 */
async function updateEnrollmentBadge() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch('/api/enrollments/all-status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const count = (data.enrolled || []).length;

        if (count > 0) {
            // 1. Update Main Navbar Link
            const courseLinks = document.querySelectorAll('#navMenu a');
            courseLinks.forEach(link => {
                const text = link.textContent.trim();
                if (text === 'Courses' || text.startsWith('Courses')) {
                    const hasChevron = link.innerHTML.includes('fa-chevron-down');
                    link.innerHTML = `Courses <span class="enroll-badge">${count}</span>${hasChevron ? ' <i class="fas fa-chevron-down ChevronIcon"></i>' : ''}`;
                }
            });

            // 2. Update User Dropdown My Courses
            const dropdownLinks = document.querySelectorAll('.dropdown-item a');
            dropdownLinks.forEach(link => {
                const text = link.textContent.trim();
                if (text === 'My Courses' || text.startsWith('My Courses')) {
                    link.innerHTML = `<i class="fas fa-book-open"></i> My Courses (${count})`;
                }
            });

            // 3. Update Dashboard link if present
            const dashboardLinks = document.querySelectorAll('.dropdown-item a');
            dashboardLinks.forEach(link => {
                if (link.textContent.trim() === 'Dashboard' && !link.innerHTML.includes('fa-th-large')) {
                     // already has icon, just making sure we don't break it
                }
            });
        }
    } catch (e) {
        console.warn('Badge Update Error:', e);
    }
}

// ==================== 4. PAGE NAVIGATION WITH JAVASCRIPT ====================
/**
 * Navigate to a specific page
 * @param {string} pageUrl - The URL/filename of the page to navigate to
 */
function navigateToPage(pageUrl) {
    // Add smooth transition effect
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';

    // Navigate after brief delay for animation
    setTimeout(() => {
        window.location.href = pageUrl;
    }, 150);
}

// ==================== 5. HASH-BASED NAVIGATION (Homepage) ====================
/**
 * Setup hash-based navigation for homepage sections
 */
function setupHashNavigation() {
    const currentPage = getCurrentPage();

    if (currentPage === 'index') {
        // Handle initial hash on page load
        if (window.location.hash) {
            handleHashNavigation(window.location.hash);
        }

        // Listen for hash changes
        window.addEventListener('hashchange', function () {
            handleHashNavigation(window.location.hash);
        });

        // Setup nav link click handlers for homepage
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');

            if (href.startsWith('#')) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = href.substring(1);

                    // Update URL
                    window.history.pushState(null, null, '#' + target);

                    // Highlight active link
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');

                    // Scroll to section
                    const section = document.getElementById(target);
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
        });
    }
}

/**
 * Handle hash navigation
 * @param {string} hash - The hash value (e.g., '#subjects')
 */
function handleHashNavigation(hash) {
    const target = hash.substring(1);
    const section = document.getElementById(target);

    if (section) {
        // Update active link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
            }
        });

        // Smooth scroll
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==================== 6. MOBILE MENU TOGGLE ====================
/**
 * Setup mobile menu toggle functionality
 */
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.navbar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'navbar-overlay';
        document.body.appendChild(overlay);
    }

    if (!menuToggle || !navMenu) return;

    function toggleMenu() {
        const isActive = navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll', isActive);
    }

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });
}

// ==================== 7. SCROLL EFFECTS FOR NAVBAR ====================
/**
 * Setup scroll effects (navbar shadow, padding changes)
 */
function setupScrollEffects() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ==================== 8. PAGE TRANSITION ANIMATIONS ====================
/**
 * Add fade-in animation to page content on load
 */
function animatePageEntrance() {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s ease';
}

/**
 * ─── Sync User State ──────────────────────────────────────────────────
 * Re-fetches user data from server and updates localStorage.
 */
async function refreshUserData() {
    const token = getAuthToken();
    if (!token) return;

    try {
        console.log('🔄 Refreshing user data from server...');
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && data.user) {
            localStorage.setItem('coursenovaUser', JSON.stringify(data.user));
            localStorage.setItem('coursenova_user', JSON.stringify(data.user));
            console.log('✅ User data synchronized');
            return data.user;
        }
    } catch (e) {
        console.error('❌ Failed to refresh user data:', e);
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
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (token && userStr) {
        try {
            // Force save to localStorage
            localStorage.setItem('coursenovaToken', token);
            localStorage.setItem('coursenova_token', token);
            localStorage.setItem('token', token);
            localStorage.setItem('coursenovaUser', userStr);
            localStorage.setItem('coursenova_user', userStr);
            localStorage.setItem('user', userStr);

            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ Authentication session established');

            // Immediately trigger a background refresh
            refreshUserData();

            // Trigger UI update
            if (typeof setupUserDropdown === 'function') setupUserDropdown();
        } catch (error) {
            console.error('❌ Redirect Auth Error:', error);
        }
    }
}

// Export global refresh
if (typeof window !== 'undefined') {
    window.refreshUserData = refreshUserData;
}

// ==================== 9. NAVIGATION UTILITIES ====================
/**
 * Get all page links for reference
 * @returns {object} Object containing all page paths
 */
function getPageLinks() {
    return {
        home: '/',
        courses: 'certificates',
        practice: 'practice',
        store: 'store',
        community: 'community',
        certificates: 'my-certificates',
        login: 'signup',
        signup: 'signup',
        dashboard: 'dashboard',
        profile: 'profile',
        analytics: 'analytics'
    };
}

/**
 * Programmatically navigate to a specific page
 * @param {string} pageName - Name of the page (e.g., 'subjects', 'practice')
 */
function goToPage(pageName) {
    const pages = getPageLinks();
    const pageUrl = pages[pageName.toLowerCase()];

    if (pageUrl) {
        navigateToPage(pageUrl);
    } else {
        console.warn(`Page "${pageName}" not found`);
    }
}

/**
 * Check if user is on a specific page
 * @param {string} pageName - Name of the page to check
 * @returns {boolean} True if on the specified page
 */
function isOnPage(pageName) {
    return getCurrentPage() === pageName.toLowerCase();
}

// ==================== 10. KEYBOARD NAVIGATION (Optional) ====================
/**
 * Setup keyboard shortcuts for navigation
 */
document.addEventListener('keydown', function (e) {
    // Alt + S = Go to Subjects
    if (e.altKey && e.key === 's') {
        e.preventDefault();
        goToPage('subjects');
    }
    // Alt + P = Go to Practice
    if (e.altKey && e.key === 'p') {
        e.preventDefault();
        goToPage('practice');
    }
    // Alt + C = Go to Certificates
    if (e.altKey && e.key === 'c') {
        e.preventDefault();
        goToPage('certificates');
    }
    // Alt + D = Go to Dashboard
    if (e.altKey && e.key === 'd') {
        e.preventDefault();
        goToPage('dashboard');
    }
    // Alt + A = Go to Analytics
    if (e.altKey && e.key === 'a') {
        e.preventDefault();
        goToPage('analytics');
    }
});

// ==================== 11. SPECIAL NAVIGATION HANDLERS ====================
/**
 * Handle "Get Started Free" button navigation
 */
function handleGetStarted() {
    navigateToPage('certificates.html');
}

/**
 * Handle "View Courses/Certificates" button navigation
 */
function handleViewCourses() {
    navigateToPage('certificates.html');
}

// ==================== 12. USER DROPDOWN MENU ==================== 
/**
 * Setup user dropdown menu on navbar
 */
function setupUserDropdown() {
    const navButtons = document.getElementById('navButtons');
    if (!navButtons) return;

    // Check for user in localStorage - Support standardized keys
    const userJson = localStorage.getItem('user') || localStorage.getItem('coursenovaUser');
    const token = localStorage.getItem('token') || localStorage.getItem('coursenovaToken');
    const role = localStorage.getItem('role') || (userJson ? JSON.parse(userJson).role : 'student');

    let user = null;

    // Safely parse user object
    try {
        if (userJson) {
            user = JSON.parse(userJson);
            // Synchronize keys for backward compatibility
            // Synchronize keys for backward compatibility - Only if truthy to avoid saving "null" string
            if (token && token !== 'null' && token !== 'undefined') {
                localStorage.setItem('token', token);
            }
            if (userJson && userJson !== 'null' && userJson !== 'undefined') {
                localStorage.setItem('user', userJson);
                // Also update the variants to ensure consistency
                localStorage.setItem('coursenovaUser', userJson);
                localStorage.setItem('coursenova_user', userJson);
            }
            if (role) localStorage.setItem('role', role);
        }
    } catch (e) {
        console.error('Error parsing user data', e);
        localStorage.clear();
    }

    // If no user, show Login/Signup buttons
    if (!user) {
        // Save the current page so we can return here after login
        const currentPath = window.location.pathname + window.location.search;
        // Don't save auth/callback pages as the return destination
        const skipPages = ['/auth-callback', '/signup', '/admin-login'];
        const shouldSaveRedirect = !skipPages.some(p => currentPath.includes(p));
        if (shouldSaveRedirect && currentPath !== '/') {
            localStorage.setItem('cn_redirect_after_login', currentPath);
        }

        navButtons.innerHTML = `
            <div id="guestButtons" style="display: flex; gap: 1rem; align-items: center;">
                <a href="signup" class="btn-login" style="text-decoration: none;">Login</a>
                <a href="signup" class="btn-signup">
                    <i class="fas fa-user-plus"></i> Signup
                </a>
            </div>
        `;
        return;
    }

    // User Found - Render Dropdown
    const firstName = user.name || user.fullName ? (user.name || user.fullName).split(' ')[0] : 'User';
    const email = user.email || '';
    const initial = firstName.charAt(0).toUpperCase();
    const dashboardLink = role === 'admin' ? 'admin-dashboard' : 'dashboard';

    // Create user menu HTML
    const userMenuHTML = `
        <div class="user-menu-wrapper">
            <button class="btn-user-menu" id="userMenuBtn" onclick="window.toggleUserDropdown(event)">
                <div class="user-avatar-small">${initial}</div>
                <span class="user-name-display">${user.name || user.fullName || 'User'}</span>
                <i class="fas fa-chevron-down ChevronIcon"></i>
            </button>
            
            <div class="user-dropdown" id="userDropdown">
                <div class="dropdown-header">
                    <div class="dropdown-user-avatar">${initial}</div>
                    <div class="dropdown-user-info">
                        <div class="dropdown-user-name">${user.name || user.fullName || 'CourseNova User'}</div>
                        <div class="dropdown-user-email">${email}</div>
                    </div>
                </div>
                
                <ul class="dropdown-items">
                    <li class="dropdown-item">
                        <a href="${dashboardLink}" onclick="window.closeUserDropdown()">
                            <i class="fas fa-th-large"></i> ${role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                        </a>
                    </li>
                    ${role !== 'admin' ? `
                    <li class="dropdown-item">
                        <a href="mock-tests" onclick="window.closeUserDropdown()">
                            <i class="fas fa-file-alt"></i> Mock Tests
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="my-certificates" onclick="window.closeUserDropdown()">
                            <i class="fas fa-trophy"></i> My Certificates
                        </a>
                    </li>
                    ` : ''}
                    <li class="dropdown-item">
                        <a href="community" onclick="window.closeUserDropdown()">
                            <i class="fas fa-users"></i> Community
                        </a>
                    </li>
                    <li class="dropdown-item" id="pwaInstallItem" style="display: none;">
                        <a href="#" onclick="window.installPWA(event)">
                            <i class="fas fa-download"></i> Install App
                        </a>
                    </li>
                    
                    <li class="dropdown-divider"></li>
                    
                    <li class="dropdown-item logout-item">
                        <a href="#" onclick="window.logoutUser(event)">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    `;

    navButtons.innerHTML = userMenuHTML;

    // Show PWA install item if prompt is deferred
    if (window.deferredPrompt) {
        const installItem = document.getElementById('pwaInstallItem');
        if (installItem) installItem.style.display = 'block';
    }
}

/**
 * Toggle user dropdown menu visibility
 */
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    const btn = document.getElementById('userMenuBtn');

    if (dropdown) {
        dropdown.classList.toggle('active');
        if (btn) btn.classList.toggle('active');
    }
}

/**
 * Close user dropdown menu
 */
function closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    const btn = document.getElementById('userMenuBtn');

    if (dropdown) dropdown.classList.remove('active');
    if (btn) btn.classList.remove('active');
}

/**
 * Logout user - Multi-layered cleanup (Server + Client)
 */
async function logoutUser(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (!confirm("Are you sure you want to logout?")) return;

    // Visual Overlay
    const overlay = document.createElement('div');
    overlay.id = 'logoutOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.95);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 100000; color: white; font-family: 'Outfit', sans-serif;
        backdrop-filter: blur(8px);
    `;
    overlay.innerHTML = `
        <div class="loader" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <h2 style="margin-top: 20px; font-weight: 700;">Logging out...</h2>
    `;
    document.body.appendChild(overlay);

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('coursenovaToken');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
        }
    } catch (e) {}

    // Local Cleanup
    localStorage.clear();
    sessionStorage.clear();

    setTimeout(() => {
        window.location.href = '/?logout=success';
    }, 800);
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const userMenuWrapper = document.querySelector('.user-menu-wrapper');
    if (userMenuWrapper && !userMenuWrapper.contains(event.target)) {
        closeUserDropdown();
    }
});

/**
 * Poll for user state changes (optional, but good for multi-tab consistency)
 */
window.addEventListener('storage', function (e) {
    if (e.key === 'coursenova_user' || e.key === 'coursenova_token') {
        setupUserDropdown();
    }
});

// ==================== 13. EXPORT NAVIGATION FUNCTIONS ====================
// These functions are available globally for use in HTML onclick handlers
if (typeof window !== 'undefined') {
    window.goToPage = goToPage;
    window.isOnPage = isOnPage;
    window.getCurrentPage = getCurrentPage;
    window.navigateToPage = navigateToPage;
    window.handleGetStarted = handleGetStarted;
    window.handleViewCourses = handleViewCourses;

    // Auth Exports
    window.setupUserDropdown = setupUserDropdown;
    window.toggleUserDropdown = toggleUserDropdown;
    window.closeUserDropdown = closeUserDropdown;
    window.logoutUser = logoutUser;
    window.updateEnrollmentBadge = updateEnrollmentBadge;
    window.getAuthToken = getAuthToken;
    window.getAuthUser = getAuthUser;
}
console.log('✅ Navigation system initialized');

// ==================== 14. NOTIFICATION SYSTEM AUTO-LOADER ====================
/**
 * Dynamically loads the notification system (js + css) on all pages.
 * Skips admin, signup, and public-only pages where notifications aren't needed.
 */
function loadNotificationSystem() {
    const token = getAuthToken();
    if (!token) return; // Don't load for guests

    const skipPages = ['admin-dashboard', 'admin-login', 'signup', 'auth-callback', 'verify-certificate'];
    const currentPage = getCurrentPage();
    if (skipPages.includes(currentPage)) return;

    // Skip if already loaded
    if (document.querySelector('script[src*="notifications.js"]')) return;

    // Inject CSS
    if (!document.querySelector('link[href*="notifications.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/notifications.css';
        document.head.appendChild(link);
    }

    // Inject JS (defer so it doesn't block render)
    const script = document.createElement('script');
    script.src = '/js/notifications.js';
    script.defer = true;
    document.head.appendChild(script);
}

// ── PWA Installation Event Listeners ─────────────────────────────────────────
window.deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    
    // Display the install item in dropdown if it is rendered
    const installItem = document.getElementById('pwaInstallItem');
    if (installItem) {
        installItem.style.display = 'block';
    }
});

window.installPWA = async function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    
    window.deferredPrompt = null;
    const installItem = document.getElementById('pwaInstallItem');
    if (installItem) {
        installItem.style.display = 'none';
    }
    
    window.closeUserDropdown();
};

window.addEventListener('appinstalled', (event) => {
    console.log('[PWA] CourseNova was successfully installed!');
    window.deferredPrompt = null;
});
