/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           COURSENOVA — SERVICE WORKER (Push Notifications)           ║
 * ║  Handles background push notification delivery and click-to-navigate ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const CACHE_NAME = 'coursenova-sw-v1';
const BASE_URL = self.location.origin;

// ── Push Event — Fired when a push message arrives ─────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'CourseNova',
            body: event.data.text() || 'You have a new notification',
            icon: '/images/coursenova-logo.png',
            data: { url: '/' }
        };
    }

    const options = {
        body: data.body || data.message || 'Check your notifications',
        icon: data.icon || '/images/coursenova-logo.png',
        badge: data.badge || '/images/coursenova-logo.png',
        image: data.image || undefined,
        tag: data.tag || 'coursenova-notif',
        data: data.data || { url: '/' },
        actions: data.actions || [
            { action: 'view', title: '👀 View', icon: '/images/coursenova-logo.png' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'CourseNova', options)
    );
});

// ── Notification Click — Handle user tapping notification ──────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : BASE_URL + targetUrl;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url.startsWith(BASE_URL) && 'focus' in client) {
                    client.focus();
                    client.navigate(fullUrl);
                    return;
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(fullUrl);
            }
        })
    );

    // Track notification click (notify the notification ID)
    const notificationId = event.notification.data?.notificationId;
    if (notificationId) {
        event.waitUntil(
            fetch(`/api/notifications/${notificationId}/click`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => {})
        );
    }
});

const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
    '/',
    OFFLINE_URL,
    '/css/style.css',
    '/css/navigation.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/js/navigation.js',
    '/js/performance.js',
    '/js/config.js',
    '/images/coursenova-logo.png'
];

// ── Install — Cache critical assets ────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// ── Activate — Clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch — Stale-While-Revalidate with offline fallback ────────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    // Skip API, Admin, and authentication endpoints
    if (url.pathname.startsWith('/api') || url.pathname.includes('logout') || url.pathname.includes('auth')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If network fails and there is no cache, return offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });

            return cachedResponse || fetchPromise;
        })
    );
});
