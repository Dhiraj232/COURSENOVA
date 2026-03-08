/**
 * ==================== RENVOX NAVIGATION SYSTEM ====================
 * 
 * This file handles all navigation functionality across the entire platform
 * Features:
 * - Active link highlighting based on current page
 * - Smooth page navigation with JavaScript
 * - Hash-based navigation on homepage
 * - Responsive mobile menu handling
 * 
 * @author RENVOX Development Team
 * @version 1.0.0
 */

// ==================== 1. NAVIGATION INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    setupNavigation();
    setupMobileMenu();
    setupScrollEffects();
    setupHashNavigation();
    setupUserDropdownIfNeeded();
    setupNavbarSearch();
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

    // Standardize links across all pages
    const links = [
        { name: 'Home', href: 'index.html', key: 'home' },
        { name: 'Courses', href: 'certificates.html', key: 'courses' },
        { name: 'Practice', href: 'practice.html', key: 'practice' },
        { name: 'Store', href: 'store.html', key: 'store' },
        { name: 'Community', href: 'community.html', key: 'community' },
        { name: 'Certificates', href: 'my-certificates.html', key: 'certificates' }
    ];

    const currentPage = getCurrentPage();

    // Inject normalized links
    navMenu.innerHTML = links.map(link => {
        let isActive = (link.href === currentPage + '.html') || (link.href === 'index.html' && currentPage === 'index');
        // Specific active rules
        if (currentPage === 'certificates' && link.href === 'certificates.html') isActive = true;
        if (currentPage === 'my-certificates' && link.href === 'my-certificates.html') isActive = true;

        return `<li><a href="${link.href}" class="${isActive ? 'active' : ''}">${link.name}</a></li>`;
    }).join('');

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

    if (!menuToggle || !navMenu) return;

    menuToggle.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });

    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.nav-container')) {
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        }
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

// Call animation on load
window.addEventListener('load', animatePageEntrance);

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

/**
 * Setup Navbar Search Input Listener
 */
function setupNavbarSearch() {
    const searchInput = document.getElementById('navbarSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleNavbarSearch();
            }
        });
    }
}

/**
 * Handle Navbar Search Submission
 */
function handleNavbarSearch() {
    const searchInput = document.getElementById('navbarSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        const query = encodeURIComponent(searchInput.value.trim());
        window.location.href = `certificates.html?search=${query}`;
    }
}

// ==================== 12. USER DROPDOWN MENU ==================== 
/**
 * Setup user dropdown menu on navbar
 */
function setupUserDropdown() {
    const navButtons = document.getElementById('navButtons');
    if (!navButtons) return;

    // Check for user in localStorage - Support both naming conventions
    const userJson = localStorage.getItem('renvox_user') || localStorage.getItem('renvoxUser');
    const token = localStorage.getItem('renvox_token') || localStorage.getItem('renvoxToken');

    let user = null;

    // Safely parse user object
    try {
        if (userJson) {
            user = JSON.parse(userJson);
            // Synchronize keys
            if (!localStorage.getItem('renvoxUser')) localStorage.setItem('renvoxUser', userJson);
            if (!localStorage.getItem('renvox_user')) localStorage.setItem('renvox_user', userJson);
            if (token) {
                if (!localStorage.getItem('renvoxToken')) localStorage.setItem('renvoxToken', token);
                if (!localStorage.getItem('renvox_token')) localStorage.setItem('renvox_token', token);
            }
        }
    } catch (e) {
        console.error('Error parsing user data', e);
        localStorage.removeItem('renvox_user');
        localStorage.removeItem('renvoxUser');
    }

    // If no user, show Login/Signup buttons
    if (!user) {
        navButtons.innerHTML = `
            <div id="guestButtons" style="display: flex; gap: 1rem; align-items: center;">
                <a href="/auth/google" class="btn-login" style="background: white; color: #4285F4; border: 1px solid #4285F4; display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                    <svg style="width:16px; height:16px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Google Login
                </a>
                <a href="#" class="btn-signup" onclick="alert('Renvox App Download will begin shortly!'); return false;">
                    <i class="fas fa-download"></i> Download App
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
                <span class="user-name-display">${email || 'User'}</span>
                <i class="fas fa-chevron-down ChevronIcon"></i>
            </button>
            
            <div class="user-dropdown" id="userDropdown">
                <div class="dropdown-header">
                    <div class="dropdown-user-avatar">${initial}</div>
                    <div class="dropdown-user-info">
                        <div class="dropdown-user-name">${user.fullName || 'RenVox User'}</div>
                        <div class="dropdown-user-email">${email}</div>
                    </div>
                </div>
                
                <ul class="dropdown-items">
                    <li class="dropdown-item">
                        <a href="certificates.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-graduation-cap"></i> Courses
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="community.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-users"></i> Community
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="my-courses.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-book-open"></i> My Courses
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="my-certificates.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-trophy"></i> My Certificates
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="dashboard.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-columns"></i> Dashboard
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="profile.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-user-circle"></i> My Profile
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
 * Logout user
 */
function logoutUser(event) {
    if (event) event.preventDefault();

    if (confirm('Are you sure you want to log out?')) {
        // Clear ALL auth data (both key formats for cross-compatibility)
        // NOTE: Only auth tokens are cleared. Course enrollments stay in MongoDB
        // and will be re-fetched when user logs in again.
        localStorage.removeItem('renvox_user');
        localStorage.removeItem('renvox_token');
        localStorage.removeItem('renvoxUser');
        localStorage.removeItem('renvoxToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('pendingUserId');

        // Redirect to home
        window.location.href = 'index.html';
    }
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
    if (e.key === 'renvox_user' || e.key === 'renvox_token') {
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
    window.handleNavbarSearch = handleNavbarSearch;

    // Auth Exports
    window.setupUserDropdown = setupUserDropdown;
    window.toggleUserDropdown = toggleUserDropdown;
    window.closeUserDropdown = closeUserDropdown;
    window.logoutUser = logoutUser;

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        setupUserDropdown();
    });
}
console.log('✅ Navigation system initialized');
