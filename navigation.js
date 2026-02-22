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

    const currentPage = getCurrentPage();
    const navLinks = navMenu.querySelectorAll('a');

    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');

        // Determine if link is active
        const href = link.getAttribute('href');

        // Handle homepage special case
        if ((href === '#home' || href === '#practice' ||
            href === '#certificates') && currentPage === 'index') {
            // Homepage hash navigation - handle in setupHashNavigation
            return;
        }

        // Compare href with current page
        if (href === currentPage + '.html' || (href === 'index.html' && currentPage === 'index')) {
            link.classList.add('active');
        }

        // Add click handler for navigation
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Allow hash navigation on homepage
            if (href.startsWith('#')) {
                e.preventDefault();
                handleHashNavigation(href);
            }
            // Navigate to other pages
            else if (href.endsWith('.html')) {
                e.preventDefault();
                navigateToPage(href);
            }
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
        practice: 'practice.html',
        certificates: 'certificates.html',
        login: 'login.html',
        signup: 'signup.html',
        dashboard: 'dashboard.html',
        profile: 'profile.html',
        analytics: 'analytics.html',
        quiz: 'quiz.html'
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

    // Check for user in localStorage
    const userJson = localStorage.getItem('renvox_user');
    let user = null;

    // Safely parse user object
    try {
        if (userJson) user = JSON.parse(userJson);
    } catch (e) {
        console.error('Error parsing user data', e);
        localStorage.removeItem('renvox_user');
    }

    // If no user, show Login/Signup buttons
    if (!user) {
        navButtons.innerHTML = `
            <div id="guestButtons" style="display: flex; gap: 1rem; align-items: center;">
                <a href="login.html" class="btn-login">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="signup.html" class="btn-signup">
                    <i class="fas fa-user-plus"></i> Sign Up
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
                <span class="user-name-display">${user.fullName || 'User'}</span>
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
                        <a href="dashboard.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-columns"></i> Dashboard
                        </a>
                    </li>
                    <li class="dropdown-item">
                        <a href="profile.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-user-circle"></i> My Profile
                        </a>
                    </li>
                     <li class="dropdown-item">
                        <a href="analytics.html" onclick="window.closeUserDropdown()">
                            <i class="fas fa-chart-pie"></i> Analytics
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
        // Clear all auth data
        localStorage.removeItem('renvox_user');
        localStorage.removeItem('renvox_token');
        localStorage.removeItem('pendingUserId');

        // Redirect to login or home
        window.location.href = 'login.html';
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
