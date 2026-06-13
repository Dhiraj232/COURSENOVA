/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           COURSENOVA — NOTIFICATION CENTER (CLIENT)                  ║
 * ║  Self-contained notification client that injects into the navbar.    ║
 * ║  Features: Bell icon, slide-in panel, real-time Socket.io,           ║
 * ║            Web Push, toast notifications, preferences modal           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

(function CourseNovaNotifications() {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────
    const API_BASE = '/api/notifications';
    const POLL_INTERVAL = 60000; // 1 min fallback polling if Socket.io misses events
    const MAX_VISIBLE = 20;

    const TYPE_ICONS = {
        new_course: '🎓',      discount: '🏷️',
        daily_challenge: '🔥', mock_test: '📝',
        course_progress: '📚', certificate: '🏆',
        order_placed: '🛍️',   order_confirmed: '✅',
        order_shipped: '📦',   order_delivered: '🎉',
        order_cancelled: '❌', order_refunded: '💰',
        payment_success: '✅', payment_failed: '❌',
        payment_pending: '⏳', payment_refund: '💰',
        announcement: '📢',    like: '❤️',
        comment: '💬',         answer: '💡',
        follow: '👤'
    };

    // ── State ──────────────────────────────────────────────────────────────
    let state = {
        notifications: [],
        unreadCount: 0,
        page: 1,
        hasMore: false,
        loading: false,
        currentFilter: 'all',
        panelOpen: false,
        pushEnabled: false,
        preferences: {}
    };

    // ── DOM Refs ───────────────────────────────────────────────────────────
    let bellBtn, badgeEl, panel, listEl, toastContainer, backdrop;

    // ── Auth Helper ────────────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem('token') || localStorage.getItem('coursenovaToken') || null;
    }

    function isLoggedIn() { return !!getToken(); }

    async function apiFetch(path, opts = {}) {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(API_BASE + path, {
            ...opts,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opts.headers || {})
            },
            body: opts.body ? JSON.stringify(opts.body) : undefined
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    // ── INITIALIZATION ─────────────────────────────────────────────────────

    function init() {
        if (!isLoggedIn()) return; // Don't load for guests

        injectStyles();
        injectBell();
        createPanel();
        createToastContainer();

        // Initial data load
        loadUnreadCount();
        connectSocket();

        // Fallback poll every minute
        setInterval(loadUnreadCount, POLL_INTERVAL);

        // Register service worker for push
        registerServiceWorker();
    }

    // ── INJECT STYLESHEET ──────────────────────────────────────────────────
    function injectStyles() {
        if (document.querySelector('link[href*="notifications.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/notifications.css';
        document.head.appendChild(link);
    }

    // ── INJECT BELL INTO NAVBAR ────────────────────────────────────────────
    function injectBell() {
        // Wait for navButtons to be available (navigation.js renders it)
        const tryInject = () => {
            const navButtons = document.getElementById('navButtons');
            if (!navButtons) return;

            // Don't inject twice
            if (document.getElementById('notifBellBtn')) return;

            // Create bell wrapper
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';

            wrapper.innerHTML = `
                <button id="notifBellBtn" class="notif-bell-btn" title="Notifications" aria-label="Open notifications">
                    <i class="fas fa-bell"></i>
                    <span id="notifBadge" class="notif-badge hidden">0</span>
                </button>
            `;

            // Prepend bell before existing navButtons content
            navButtons.prepend(wrapper);

            bellBtn = document.getElementById('notifBellBtn');
            badgeEl = document.getElementById('notifBadge');

            bellBtn.addEventListener('click', togglePanel);
        };

        // Try immediately and retry for deferred navigation rendering
        tryInject();
        setTimeout(tryInject, 500);
        setTimeout(tryInject, 1500);
    }

    // ── PANEL CREATION ─────────────────────────────────────────────────────
    function createPanel() {
        panel = document.createElement('div');
        panel.id = 'notifPanel';
        panel.className = 'notif-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Notifications');
        panel.innerHTML = getPanelHTML();
        document.body.appendChild(panel);

        listEl = document.getElementById('notifList');

        // Wire up panel actions
        document.getElementById('notifCloseBtn')?.addEventListener('click', closePanel);
        document.getElementById('notifMarkAllBtn')?.addEventListener('click', markAllRead);
        document.getElementById('notifClearAllBtn')?.addEventListener('click', clearAll);
        document.getElementById('notifPrefsBtn')?.addEventListener('click', openPreferences);

        // Filter buttons
        panel.querySelectorAll('.notif-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.type;
                state.page = 1;
                state.notifications = [];
                loadNotifications(true);
            });
        });
    }

    function getPanelHTML() {
        return `
        <div class="notif-panel-header">
            <h3>
                <i class="fas fa-bell" style="color:#4f46e5"></i>
                Notifications
                <span class="unread-pill" id="panelUnreadPill" style="display:none">0</span>
            </h3>
            <div class="notif-header-actions">
                <button class="notif-header-btn" id="notifMarkAllBtn" title="Mark all as read">
                    <i class="fas fa-check-double"></i> All read
                </button>
                <button class="notif-header-btn" id="notifPrefsBtn" title="Notification preferences">
                    <i class="fas fa-sliders-h"></i>
                </button>
                <button class="notif-close-btn" id="notifCloseBtn" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <div class="notif-filters">
            <button class="notif-filter-btn active" data-type="all">All</button>
            <button class="notif-filter-btn" data-type="announcement">📢 Announcements</button>
            <button class="notif-filter-btn" data-type="new_course">🎓 Courses</button>
            <button class="notif-filter-btn" data-type="daily_challenge">🔥 Challenge</button>
            <button class="notif-filter-btn" data-type="mock_test">📝 Tests</button>
            <button class="notif-filter-btn" data-type="payment_success">💳 Payments</button>
            <button class="notif-filter-btn" data-type="order_placed">🛍️ Orders</button>
        </div>

        <div class="notif-list" id="notifList">
            ${getSkeletonHTML()}
        </div>

        <div class="notif-panel-footer">
            <button class="notif-footer-btn" id="notifClearAllBtn">
                <i class="fas fa-trash-alt"></i> Clear all
            </button>
        </div>
        `;
    }

    function getSkeletonHTML() {
        return Array(4).fill('').map(() => `
            <div class="notif-skeleton">
                <div class="notif-skeleton-icon"></div>
                <div class="notif-skeleton-content">
                    <div class="notif-skeleton-line"></div>
                    <div class="notif-skeleton-line short"></div>
                </div>
            </div>
        `).join('');
    }

    // ── PANEL TOGGLE ───────────────────────────────────────────────────────
    function togglePanel(e) {
        if (e) e.stopPropagation();
        state.panelOpen ? closePanel() : openPanel();
    }

    function openPanel() {
        state.panelOpen = true;
        panel?.classList.add('open');
        bellBtn?.classList.add('active');

        // Create backdrop
        backdrop = document.createElement('div');
        backdrop.className = 'notif-backdrop';
        backdrop.addEventListener('click', closePanel);
        document.body.appendChild(backdrop);

        // Load notifications on first open
        if (state.notifications.length === 0) {
            loadNotifications(true);
        }

        // Trap focus
        panel?.focus();
    }

    function closePanel() {
        state.panelOpen = false;
        panel?.classList.remove('open');
        bellBtn?.classList.remove('active');
        backdrop?.remove();
        backdrop = null;
    }

    // ── LOAD NOTIFICATIONS ─────────────────────────────────────────────────
    async function loadNotifications(reset = false) {
        if (state.loading) return;
        state.loading = true;

        if (reset) {
            state.page = 1;
            state.notifications = [];
            listEl.innerHTML = getSkeletonHTML();
        }

        try {
            const params = new URLSearchParams({
                page: state.page,
                limit: MAX_VISIBLE
            });
            if (state.currentFilter !== 'all') params.set('type', state.currentFilter);

            const data = await apiFetch(`?${params}`);
            const newItems = data.notifications || [];

            if (reset) {
                state.notifications = newItems;
            } else {
                state.notifications = [...state.notifications, ...newItems];
            }

            state.hasMore = data.pagination?.hasMore || false;
            renderNotifications();
        } catch (err) {
            listEl.innerHTML = `<div class="notif-empty">
                <div class="notif-empty-icon">⚠️</div>
                <p>Could not load notifications.<br>Check your connection.</p>
            </div>`;
        } finally {
            state.loading = false;
        }
    }

    function renderNotifications() {
        if (!listEl) return;

        if (state.notifications.length === 0) {
            listEl.innerHTML = `<div class="notif-empty">
                <div class="notif-empty-icon">🔔</div>
                <p>You're all caught up!<br>No notifications to show.</p>
            </div>`;
            return;
        }

        listEl.innerHTML = state.notifications.map(n => renderNotifItem(n)).join('');

        // Load more button
        if (state.hasMore) {
            const loadMore = document.createElement('div');
            loadMore.className = 'notif-load-more';
            loadMore.innerHTML = `<button class="notif-load-more-btn" id="notifLoadMoreBtn">
                <i class="fas fa-chevron-down"></i> Load more
            </button>`;
            listEl.appendChild(loadMore);
            document.getElementById('notifLoadMoreBtn')?.addEventListener('click', () => {
                state.page++;
                loadNotifications(false);
            });
        }

        // Wire up item actions
        listEl.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.notif-item-btn')) return;
                const id = el.dataset.id;
                const url = el.dataset.url;
                handleNotifClick(id, url);
            });
        });

        listEl.querySelectorAll('.notif-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNotification(btn.dataset.id, btn.closest('.notif-item'));
            });
        });

        listEl.querySelectorAll('.notif-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                markOneRead(btn.dataset.id, btn.closest('.notif-item'));
            });
        });
    }

    function renderNotifItem(n) {
        const icon = TYPE_ICONS[n.type] || '🔔';
        const timeAgo = formatTimeAgo(n.createdAt);
        const unreadClass = n.isRead ? '' : 'unread';

        return `<div class="notif-item ${unreadClass}" data-id="${n._id}" data-url="${n.actionUrl || ''}">
            <div class="notif-icon type-${n.type}">${icon}</div>
            <div class="notif-content">
                <div class="notif-title">${escapeHTML(n.title)}</div>
                <div class="notif-msg">${escapeHTML(n.message)}</div>
                <div class="notif-meta">
                    <span class="notif-time">${timeAgo}</span>
                    ${n.actionUrl ? `<a class="notif-action-link" href="${n.actionUrl}" onclick="event.stopPropagation()">${escapeHTML(n.actionLabel || 'View')}</a>` : ''}
                </div>
            </div>
            <div class="notif-item-actions">
                ${!n.isRead ? `<button class="notif-item-btn mark-read notif-read-btn" data-id="${n._id}" title="Mark as read"><i class="fas fa-check"></i></button>` : ''}
                <button class="notif-item-btn notif-del-btn" data-id="${n._id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }

    // ── ACTIONS ────────────────────────────────────────────────────────────
    async function handleNotifClick(id, url) {
        // Track click
        apiFetch(`/${id}/click`, { method: 'PUT' }).catch(() => {});
        // Update local state
        const notif = state.notifications.find(n => n._id === id);
        if (notif && !notif.isRead) {
            notif.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
            updateBadge();
        }
        // Navigate
        if (url && url !== 'null') {
            closePanel();
            setTimeout(() => { window.location.href = url; }, 150);
        }
    }

    async function markOneRead(id, el) {
        try {
            await apiFetch(`/${id}/read`, { method: 'PUT' });
            el?.classList.remove('unread');
            el?.querySelector('.notif-read-btn')?.remove();
            const notif = state.notifications.find(n => n._id === id);
            if (notif && !notif.isRead) {
                notif.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
                updateBadge();
            }
        } catch (e) {}
    }

    async function markAllRead() {
        try {
            await apiFetch('/read-all', { method: 'PUT' });
            state.notifications.forEach(n => { n.isRead = true; });
            state.unreadCount = 0;
            updateBadge();
            renderNotifications();
        } catch (e) {}
    }

    async function deleteNotification(id, el) {
        el?.style.setProperty('opacity', '0.4');
        el?.style.setProperty('pointer-events', 'none');
        try {
            await apiFetch(`/${id}`, { method: 'DELETE' });
            state.notifications = state.notifications.filter(n => n._id !== id);
            el?.remove();
            if (state.notifications.length === 0) renderNotifications();
        } catch (e) {
            el?.style.removeProperty('opacity');
            el?.style.removeProperty('pointer-events');
        }
    }

    async function clearAll() {
        if (!confirm('Clear all notifications?')) return;
        try {
            await apiFetch('/clear-all', { method: 'DELETE' });
            state.notifications = [];
            state.unreadCount = 0;
            updateBadge();
            renderNotifications();
        } catch (e) {}
    }

    // ── UNREAD COUNT ───────────────────────────────────────────────────────
    async function loadUnreadCount() {
        if (!isLoggedIn()) return;
        try {
            const data = await apiFetch('/unread-count');
            state.unreadCount = data.count || 0;
            updateBadge();
        } catch (e) {}
    }

    function updateBadge() {
        if (!badgeEl) return;
        const count = state.unreadCount;

        if (count > 0) {
            badgeEl.textContent = count > 99 ? '99+' : count;
            badgeEl.classList.remove('hidden');
            bellBtn?.classList.add('has-unread');
        } else {
            badgeEl.classList.add('hidden');
            bellBtn?.classList.remove('has-unread');
        }

        // Update panel pill
        const pill = document.getElementById('panelUnreadPill');
        if (pill) {
            pill.textContent = count;
            pill.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    // ── SOCKET.IO REAL-TIME ────────────────────────────────────────────────
    function connectSocket() {
        // Socket.io is already loaded on pages that need it
        // We hook into it if available
        const checkSocket = () => {
            if (typeof io === 'undefined') return;

            try {
                const token = getToken();
                const userStr = localStorage.getItem('user') || localStorage.getItem('coursenovaUser');
                const user = userStr ? JSON.parse(userStr) : null;
                if (!user?.id && !user?._id) return;

                const userId = user.id || user._id;

                // Use existing socket if already connected, or create new one
                if (!window._notifSocket) {
                    window._notifSocket = io({ transports: ['websocket', 'polling'] });
                    window._notifSocket.emit('identify', userId);
                }

                const socket = window._notifSocket;

                socket.off('notification:new'); // Remove existing listeners

                socket.on('notification:new', (notif) => {
                    // Prepend to local state
                    state.notifications.unshift(notif);
                    state.unreadCount++;
                    updateBadge();

                    // Update panel if open
                    if (state.panelOpen) {
                        renderNotifications();
                    }

                    // Show toast
                    showToast(notif);
                });
            } catch (e) {}
        };

        checkSocket();
        setTimeout(checkSocket, 1000);
        setTimeout(checkSocket, 3000);
    }

    // ── TOAST ──────────────────────────────────────────────────────────────
    function createToastContainer() {
        toastContainer = document.createElement('div');
        toastContainer.className = 'notif-toast-container';
        toastContainer.id = 'notifToastContainer';
        document.body.appendChild(toastContainer);
    }

    function showToast(notif) {
        const icon = TYPE_ICONS[notif.type] || '🔔';
        const toast = document.createElement('div');
        toast.className = 'notif-toast';
        toast.innerHTML = `
            <div class="notif-toast-icon">${icon}</div>
            <div class="notif-toast-body">
                <div class="notif-toast-title">${escapeHTML(notif.title)}</div>
                <div class="notif-toast-msg">${escapeHTML(notif.message)}</div>
            </div>
            <button class="notif-toast-close" onclick="this.closest('.notif-toast').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Click to open panel
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.notif-toast-close')) return;
            toast.classList.add('dismissing');
            setTimeout(() => toast.remove(), 300);
            if (notif.actionUrl && notif.actionUrl !== 'null') {
                window.location.href = notif.actionUrl;
            } else {
                openPanel();
            }
        });

        toastContainer.appendChild(toast);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('dismissing');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // ── PREFERENCES MODAL ──────────────────────────────────────────────────
    async function openPreferences() {
        try {
            const data = await apiFetch('/preferences');
            state.preferences = data.preferences || {};
        } catch (e) {
            state.preferences = {};
        }

        const overlay = document.createElement('div');
        overlay.className = 'notif-prefs-overlay';
        overlay.id = 'notifPrefsOverlay';
        overlay.innerHTML = getPrefsModalHTML(state.preferences);
        document.body.appendChild(overlay);

        // Wire up push enable button
        const pushBtn = document.getElementById('notifPushBtn');
        if (pushBtn) {
            const pushState = Notification.permission;
            if (pushState === 'granted') {
                pushBtn.textContent = '✅ Enabled';
                pushBtn.disabled = true;
            }
            pushBtn.addEventListener('click', enablePushNotifications);
        }

        // Save button
        document.getElementById('notifPrefsSave')?.addEventListener('click', savePreferences);
        document.getElementById('notifPrefsCancel')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    function getPrefsModalHTML(prefs) {
        const prefItems = [
            { key: 'inApp', icon: '🔔', label: 'In-App Notifications', desc: 'Show notifications in the app' },
            { key: 'dailyChallenge', icon: '🔥', label: 'Daily Challenge', desc: 'Remind me about daily challenges' },
            { key: 'mockTest', icon: '📝', label: 'Mock Test Reminders', desc: 'Daily test reminders' },
            { key: 'courseProgress', icon: '📚', label: 'Course Reminders', desc: 'Resume incomplete courses' },
            { key: 'newCourses', icon: '🎓', label: 'New Courses', desc: 'When new courses are published' },
            { key: 'discounts', icon: '🏷️', label: 'Discount Alerts', desc: 'Coupons and special offers' },
            { key: 'orderUpdates', icon: '📦', label: 'Order Updates', desc: 'Order and payment status' },
            { key: 'announcements', icon: '📢', label: 'Announcements', desc: 'Platform news and updates' }
        ];

        const pushGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';

        return `
        <div class="notif-prefs-modal">
            <h4><i class="fas fa-sliders-h" style="color:#4f46e5"></i> Notification Preferences</h4>
            <p class="modal-subtitle">Choose what you want to be notified about</p>

            <div class="notif-push-section">
                <div class="notif-push-info">
                    <strong>🔔 Browser Push Notifications</strong>
                    <span>${pushGranted ? 'Push notifications are enabled' : 'Get notified even when the app is closed'}</span>
                </div>
                <button class="notif-push-enable-btn" id="notifPushBtn" ${pushGranted ? 'disabled' : ''}>
                    ${pushGranted ? '✅ Enabled' : 'Enable'}
                </button>
            </div>

            ${prefItems.map(item => `
            <div class="notif-pref-item">
                <div class="notif-pref-label">
                    <div class="notif-pref-label-icon">${item.icon}</div>
                    <div>
                        <div class="notif-pref-label-text">${item.label}</div>
                        <div class="notif-pref-label-desc">${item.desc}</div>
                    </div>
                </div>
                <label class="notif-toggle">
                    <input type="checkbox" data-pref="${item.key}" ${prefs[item.key] !== false ? 'checked' : ''}>
                    <span class="notif-toggle-slider"></span>
                </label>
            </div>
            `).join('')}

            <div class="notif-prefs-actions">
                <button class="notif-prefs-cancel" id="notifPrefsCancel">Cancel</button>
                <button class="notif-prefs-save" id="notifPrefsSave">
                    <i class="fas fa-save"></i> Save Preferences
                </button>
            </div>
        </div>`;
    }

    async function savePreferences() {
        const overlay = document.getElementById('notifPrefsOverlay');
        const updates = {};
        overlay?.querySelectorAll('input[data-pref]').forEach(input => {
            updates[input.dataset.pref] = input.checked;
        });

        try {
            await apiFetch('/preferences', { method: 'PUT', body: updates });
            state.preferences = { ...state.preferences, ...updates };
            overlay?.remove();
            showToast({ type: 'announcement', title: '✅ Preferences saved!', message: 'Your notification settings have been updated.' });
        } catch (e) {
            alert('Failed to save preferences. Please try again.');
        }
    }

    // ── WEB PUSH ───────────────────────────────────────────────────────────
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            window._swReg = reg;

            // Check if already subscribed
            const existing = await reg.pushManager.getSubscription();
            if (existing) {
                state.pushEnabled = true;
                await syncSubscription(existing);
            }
        } catch (err) {
            console.warn('[Push] Service worker registration failed:', err.message);
        }
    }

    async function enablePushNotifications() {
        const btn = document.getElementById('notifPushBtn');
        if (!('Notification' in window)) {
            alert('Your browser does not support push notifications.');
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            if (btn) btn.textContent = '❌ Denied';
            return;
        }

        if (btn) { btn.textContent = 'Subscribing...'; btn.disabled = true; }

        try {
            // Get VAPID key
            const { publicKey } = await apiFetch('/vapid-public-key');
            if (!publicKey) throw new Error('VAPID key not available');

            let reg = window._swReg;
            if (!reg) {
                reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                window._swReg = reg;
            }

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlB64ToUint8Array(publicKey)
            });

            await syncSubscription(sub);
            state.pushEnabled = true;

            if (btn) { btn.textContent = '✅ Enabled'; btn.disabled = true; }
        } catch (err) {
            console.error('[Push] Subscription failed:', err);
            if (btn) { btn.textContent = 'Try Again'; btn.disabled = false; }
        }
    }

    async function syncSubscription(sub) {
        try {
            await apiFetch('/push-subscribe', {
                method: 'POST',
                body: { subscription: sub.toJSON() }
            });
        } catch (e) {}
    }

    function urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    }

    // ── UTILITIES ──────────────────────────────────────────────────────────
    function formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── PUBLIC API (for other scripts to trigger notifications) ────────────
    window.CourseNovaNotifications = {
        showToast,
        openPanel,
        closePanel,
        refresh: () => loadNotifications(true),
        refreshCount: loadUnreadCount
    };

    // ── START ──────────────────────────────────────────────────────────────
    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // If navigation.js runs first and sets up user dropdown, inject bell after
        setTimeout(init, 100);
    }

})();
