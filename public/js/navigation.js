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
 * @version 1.0.0
 */

// 1. AUTH HELPERS
/**
 * Safely get the auth token from localStorage (handles both naming conventions)
 * @returns {string|null} The token or null
 */
function getAuthToken() {
    return localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
}

/**
 * Safely get the user object from localStorage
 * @returns {object|null} The user object or null
 */
function getAuthUser() {
    const userStr = localStorage.getItem('coursenova_user') || localStorage.getItem('coursenovaUser');
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
        { name: 'Home', href: 'index.html', key: 'home' },
        { name: 'Courses', href: 'certificates.html', key: 'courses' },
        { name: 'Mock Tests', href: 'mock-tests.html', key: 'tests' },
        { name: 'Community', href: 'community.html', key: 'community' },
        { name: 'Store', href: 'store.html', key: 'store' }
    ];

    const currentPage = getCurrentPage();

    // Inject normalized links
    navMenu.innerHTML = links.map(link => {
        let isActive = (link.href === currentPage + '.html') || (link.href === 'index.html' && currentPage === 'index');
        
        if (link.dropdown) {
            // Check if any dropdown item is active
            const isDropdownActive = link.dropdown.some(d => d.href === currentPage + '.html' || (currentPage === 'my-certificates' && d.href === 'certificates.html'));
            
            let dropdownHtml = `<li class="nav-dropdown">
                <a href="${link.href}" class="nav-dropdown-toggle ${isDropdownActive ? 'active' : ''}">${link.name} <i class="fas fa-chevron-down ChevronIcon"></i></a>
                <ul class="nav-dropdown-menu">`;
            
            link.dropdown.forEach(d => {
                let isSubActive = (d.href === currentPage + '.html') || (currentPage === 'my-certificates' && d.href === 'certificates.html');
                dropdownHtml += `<li><a href="${d.href}" class="${isSubActive ? 'active' : ''}">${d.name}</a></li>`;
            });
            
            dropdownHtml += `</ul></li>`;
            return dropdownHtml;
        } else {
            // Specific active rules
            if (currentPage === 'mock-tests' && link.href === 'mock-tests.html') isActive = true;

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
            localStorage.setItem('coursenovaUser', userStr);
            localStorage.setItem('coursenova_user', userStr);

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
        home: 'index.html',
        courses: 'certificates.html',
        practice: 'practice.html',
        store: 'store.html',
        community: 'community.html',
        certificates: 'my-certificates.html',
        login: 'signup.html',
        signup: 'signup.html',
        dashboard: 'dashboard.html',
        profile: 'profile.html',
        analytics: 'analytics.html'
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

    // Check for user in localStorage - Support both naming conventions
    const userJson = localStorage.getItem('coursenova_user') || localStorage.getItem('coursenovaUser');
    const token = localStorage.getItem('coursenova_token') || localStorage.getItem('coursenovaToken');

    let user = null;

    // Safely parse user object
    try {
        if (userJson) {
            user = JSON.parse(userJson);
            // Synchronize keys
            if (!localStorage.getItem('coursenovaUser')) localStorage.setItem('coursenovaUser', userJson);
            if (!localStorage.getItem('coursenova_user')) localStorage.setItem('coursenova_user', userJson);
            if (token) {
                if (!localStorage.getItem('coursenovaToken')) localStorage.setItem('coursenovaToken', token);
                if (!localStorage.getItem('coursenova_token')) localStorage.setItem('coursenova_token', token);
            }
        }
    } catch (e) {
        console.error('Error parsing user data', e);
        localStorage.removeItem('coursenova_user');
        localStorage.removeItem('coursenovaUser');
    }

    // If no user, show Login/Signup buttons
    if (!user) {
        navButtons.innerHTML = `
            <div id="guestButtons" style="display: flex; gap: 1rem; align-items: center;">
                <a href="${window.COURSENOVA_API || ''}/api/auth/google" class="btn-login" style="background: white; color: #4285F4; border: 1px solid #4285F4; display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                    <svg style="width:16px; height:16px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Google Login
                </a>
                <a href="signup.html" class="btn-signup">
                    <i class="fas fa-user-plus"></i> Signup
                </a>
            </div>
        `;
        return;
    }

    // User Found - Render Dropdown
    const firstName = user.fullName ? user.fullName.split(' ')[0] : 'User';
    const email = user.email || '';
    const initial = firstName.charAt(0).toUpperCase();

    // Create user menu HTML
    const userMenuHTML = `
        <div class="user-menu-wrapper">
            <button class="btn-user-menu" id="userMenuBtn" onclick="window.toggleUserDropdown(event)">
                <div class="user-avatar-small">${initial}</div>
                <span class="user-name-display">${user.name || firstName || 'User'}</span>
                <i class="fas fa-chevron-down ChevronIcon"></i>
            </button>
            
            <div class="user-dropdown" id="userDropdown">
                <div class="dropdown-header">
                    <div class="dropdown-user-avatar">${initial}</div>
                    <div class="dropdown-user-info">
                        <div class="dropdown-user-name">${user.fullName || 'CourseNova User'}</div>
                        <div class="dropdown-user-email">${email}</div>
                    </div>
                </div>
                
                <ul class="dropdown-items">
                    <li class="dropdown-item">
                        <a href="dashboard.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-th-large"></i> Dashboard
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="mock-tests.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-file-alt"></i> Mock Tests
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="my-certificates.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-trophy"></i> My Certificates
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="community.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-users"></i> Community
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

    // Add click event to close dropdown when clicking outside (handled by global listener below)
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

    // 1. Confirmation
    const confirmLogout = confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    // 2. Visual Overlay
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
        // 3. Notify backend (short timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const apiBase = (window.COURSENOVA_API || '').replace(/\/$/, '');
        await fetch(`${apiBase}/api/auth/logout`, {
            signal: controller.signal,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token')}` }
        }).catch(() => { });

        clearTimeout(timeoutId);
    } catch (e) { }

    // 4. Local Cleanup
    localStorage.clear();
    sessionStorage.clear();

    // 5. Finalize
    setTimeout(() => {
        window.location.href = 'index.html?logout=true';
    }, 500);
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
}
console.log('✅ Navigation system initialized');
