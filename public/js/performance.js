/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          COURSENOVA — CLIENT-SIDE PERFORMANCE ENGINE                 ║
 * ║  Implements:                                                         ║
 * ║    1. Image & Video Lazy Loading (via IntersectionObserver)         ║
 * ║    2. Link Prefetching on Hover (0ms navigation transitions)          ║
 * ║    3. Automatic content-visibility CSS enhancements                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

(function() {
    'use strict';

    // ── 1. Media Lazy Loading ────────────────────────────────────────────────
    function initLazyLoading() {
        // Enforce native lazy loading on all images
        const lazyImages = document.querySelectorAll('img:not([loading="lazy"])');
        lazyImages.forEach(img => {
            img.setAttribute('loading', 'lazy');
        });

        // IntersectionObserver for video / iframe deferral
        const mediaObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const media = entry.target;
                    if (media.dataset.src) {
                        media.src = media.dataset.src;
                        delete media.dataset.src;
                    }
                    observer.unobserve(media);
                }
            });
        }, {
            rootMargin: '200px 0px', // Start loading 200px before entry
            threshold: 0.01
        });

        document.querySelectorAll('iframe[data-src], video[data-src]').forEach(media => {
            mediaObserver.observe(media);
        });
    }

    // ── 2. Link Prefetching on Hover ──────────────────────────────────────────
    const prefetchedUrls = new Set();

    function prefetchUrl(url) {
        if (!url || prefetchedUrls.has(url)) return;

        try {
            const parsed = new URL(url, window.location.origin);
            // Verify same-origin, not API route, and not auth callback
            if (parsed.origin !== window.location.origin) return;
            if (parsed.pathname.startsWith('/api') || parsed.pathname.includes('logout') || parsed.pathname.includes('auth-callback')) return;

            prefetchedUrls.add(url);

            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
            console.log(`[Performance] Prefetched: ${url}`);
        } catch (e) {
            // Ignore malformed URIs
        }
    }

    function initLinkPrefetching() {
        let hoverTimeout = null;

        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a');
            if (!link || !link.href) return;

            // Don't prefetch external links, anchors, or new-tabs
            if (link.target === '_blank' || link.href.includes('#') || link.href.startsWith('javascript:')) return;

            hoverTimeout = setTimeout(() => {
                prefetchUrl(link.href);
            }, 60); // 60ms intentional hover threshold
        });

        document.addEventListener('mouseout', (e) => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
        });
    }

    // ── 3. Breadcrumb Schema Auto-Injection ───────────────────────────────────
    function injectBreadcrumbSchema() {
        const hostname = window.location.origin;
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';

        if (pageName === 'index') return; // Homepage doesn't need breadcrumbs

        const breadcrumbMap = {
            'store': [
                { name: 'Home', path: '/' },
                { name: 'Store', path: '/store' }
            ],
            'book-detail': [
                { name: 'Home', path: '/' },
                { name: 'Store', path: '/store' },
                { name: 'Book Details', path: window.location.pathname + window.location.search }
            ],
            'certificates': [
                { name: 'Home', path: '/' },
                { name: 'Courses', path: '/certificates' }
            ],
            'course-content': [
                { name: 'Home', path: '/' },
                { name: 'Courses', path: '/certificates' },
                { name: 'Course Content', path: window.location.pathname + window.location.search }
            ],
            'mock-tests': [
                { name: 'Home', path: '/' },
                { name: 'Mock Tests', path: '/mock-tests' }
            ],
            'cgpa-calculator': [
                { name: 'Home', path: '/' },
                { name: 'CGPA Calculator', path: '/cgpa-calculator' }
            ],
            'daily-challenge': [
                { name: 'Home', path: '/' },
                { name: 'Daily Challenge', path: '/daily-challenge' }
            ],
            'community': [
                { name: 'Home', path: '/' },
                { name: 'Community', path: '/community' }
            ],
            'profile': [
                { name: 'Home', path: '/' },
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Profile', path: '/profile' }
            ],
            'dashboard': [
                { name: 'Home', path: '/' },
                { name: 'Dashboard', path: '/dashboard' }
            ]
        };

        const list = breadcrumbMap[pageName] || [
            { name: 'Home', path: '/' },
            { name: pageName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), path: window.location.pathname }
        ];

        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": list.map((item, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "name": item.name,
                "item": item.path.startsWith('http') ? item.path : `${hostname}${item.path}`
            }))
        };

        try {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'coursenova-breadcrumb-schema';
            script.text = JSON.stringify(schema);
            document.head.appendChild(script);
        } catch (err) {
            console.error('Failed to inject breadcrumb schema:', err);
        }
    }

    // ── 4. Initialization ────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initLazyLoading();
            initLinkPrefetching();
            injectBreadcrumbSchema();
        });
    } else {
        initLazyLoading();
        initLinkPrefetching();
        injectBreadcrumbSchema();
    }
})();
