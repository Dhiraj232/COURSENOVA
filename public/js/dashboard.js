/**
 * ==================== RENVOX REAL-TIME DASHBOARD ====================
 * Handles Socket.io events, telemetry tracking, and dynamic UI updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    const userStr = localStorage.getItem('renvoxUser') || localStorage.getItem('renvox_user');
    
    if (!token || !userStr) {
        window.location.href = 'signup.html?redirect=dashboard.html';
        return;
    }

    const user = JSON.parse(userStr);
    const userId = user.id || user._id;

    // 1. Initialize Sockets
    initSockets(userId);

    // 2. Initial Data Fetch
    fetchDashboardOverview();

    // 3. Telemetry Logic
    initTelemetry();

    // 4. Library Tab Logic
    initLibraryTabs();
});

let socket;
function initSockets(userId) {
    // If running on a different port (e.g. Live Server), connect explicitly to backend
    const socketUrl = window.location.port !== '5000' && window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : window.location.origin;

    socket = io(socketUrl);

    socket.on('connect', () => {
        console.log('✅ Connected to Renvox Live Engine');
        socket.emit('identify', userId);
    });

    socket.on('dashboard_update', (data) => {
        console.log('🚀 Live Update Received:', data);
        showLiveNotification(data.message);
        // Refresh overview when a major event happens
        fetchDashboardOverview();
    });

    socket.on('connect_error', (err) => {
        console.warn('❌ Socket connection failed, retrying...', err.message);
    });
}

/**
 * Fetch Comprehensive Dashboard Data
 */
async function fetchDashboardOverview() {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    try {
        const res = await fetch('/api/analytics/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            updateDashboardUI(data);
            renderPerformanceChart(data.testResults);
        }
    } catch (err) {
        console.error('Failed to fetch dashboard:', err);
    }
}

function updateDashboardUI(data) {
    const { user, stats, courses, recentActivities } = data;

    // Header & User Name Logic (Fallback to email prefix if name is missing)
    const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Learner');
    const firstName = displayName.split(' ')[0] || 'Learner';

    if (document.getElementById('studentFirstName')) {
        document.getElementById('studentFirstName').innerText = firstName;
    }
    if (document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').innerText = displayName;
    }
    if (document.getElementById('streakCounter')) {
        document.getElementById('streakCounter').innerText = `${stats.streak} day`;
    }
    if (document.getElementById('userAvatar')) {
        document.getElementById('userAvatar').innerText = firstName.charAt(0).toUpperCase();
    }

    // A. Overview Cards
    const elIds = {
        'enrolledCount': stats.totalCourses,
        'batchesCount': stats.totalBatches,
        'booksCount': stats.totalBooks,
        'testsTakenCount': stats.totalTestsTaken
    };

    for (const [id, val] of Object.entries(elIds)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val || 0;
    }
    
    // Time Spent Formatting
    const timeSpentEl = document.getElementById('timeSpentCount');
    if (timeSpentEl) {
        const h = Math.floor(stats.totalTime / 60);
        const m = stats.totalTime % 60;
        timeSpentEl.innerText = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    // B. Progress Section
    const progressGrid = document.getElementById('courseProgressGrid');
    if (progressGrid) {
        progressGrid.innerHTML = courses.map(c => `
            <div class="topic-item" style="margin-bottom: 15px;">
                <div class="topic-info" style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600;">
                    <span>${c.title}</span>
                    <span>${c.progress}%</span>
                </div>
                <div class="progress-bar-bg" style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-top: 5px;">
                    <div class="progress-bar-fill" style="width: ${c.progress}%; height: 100%; background: linear-gradient(135deg, #6366f1, #a855f7); transition: width 0.5s ease;"></div>
                </div>
            </div>
        `).join('') || '<p class="text-gray">No active courses.</p>';
    }

    // C. Activity Timeline
    const timeline = document.getElementById('activityTimeline');
    if (timeline) {
        timeline.innerHTML = recentActivities.map(act => `
            <li style="display: flex; gap: 15px; align-items: flex-start; margin-bottom: 20px;">
                <div class="activity-dot ${getActivityClass(act.type)}" style="width: 12px; height: 12px; border-radius: 50%; margin-top: 5px;"></div>
                <div class="activity-text">
                    <p style="margin: 0; font-size: 0.9rem; font-weight: 500;"><strong>${getActivityLabel(act.type)}:</strong> ${act.title}</p>
                    <span style="font-size: 0.75rem; color: #64748b;">${formatTime(act.timestamp)}</span>
                </div>
            </li>
        `).join('') || '<p class="text-gray">No recent activity.</p>';
    }

    // D. Performance Stats
    if (document.getElementById('avgScoreDisplay')) document.getElementById('avgScoreDisplay').innerText = `${stats.avgScore || 0}%`;
    if (document.getElementById('bestScoreDisplay')) document.getElementById('bestScoreDisplay').innerText = `${stats.bestScore || 0}%`;
    if (document.getElementById('accuracyDisplay')) document.getElementById('accuracyDisplay').innerText = `${stats.accuracy || 0}%`;

    // E. Default Library (Courses)
    renderLibrary('course', courses);
}

/**
 * Telemetry: Session Tracking
 */
let currentSessionId = null;
async function initTelemetry() {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    try {
        const res = await fetch('/api/analytics/time/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ context: 'platform' })
        });
        const d = await res.json();
        if (d.ok) currentSessionId = d.sessionId;
    } catch (e) {}

    window.addEventListener('beforeunload', () => {
        if (currentSessionId) {
            navigator.sendBeacon('/api/analytics/time/stop', JSON.stringify({ sessionId: currentSessionId }));
        }
    });
}

function initLibraryTabs() {
    document.querySelectorAll('.lib-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.dataset.type;
            
            if (type === 'course') {
                const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
                const res = await fetch('/api/analytics/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
                const d = await res.json();
                renderLibrary('course', d.courses);
            } else {
                renderLibrary('book', []); 
            }
        });
    });
}

function renderLibrary(type, items) {
    const list = document.getElementById('libraryContent');
    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 20px;">No items found in your library.</p>';
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="lib-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fff; border-radius: 14px; border: 1px solid #f1f5f9; margin-bottom: 10px;">
            <div class="lib-item-icon" style="width: 40px; height: 40px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #6366f1;">
                <i class="fas ${type === 'course' ? 'fa-play-circle' : 'fa-book'}"></i>
            </div>
            <div class="lib-item-info">
                <h5 style="margin: 0; font-size: 0.9rem; font-weight: 700;">${item.title}</h5>
                <span style="font-size: 0.75rem; color: #10b981; font-weight: 700;">${type === 'course' ? item.progress + '% Complete' : 'Purchased'}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Charting logic
 */
let chartInstance = null;
function renderPerformanceChart(results) {
    const canvasEl = document.getElementById('performanceChart');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const labels = results && results.length ? results.map((_, i) => `Test ${i + 1}`).reverse() : ['No Data'];
    const scores = results && results.length ? results.map(r => r.score).reverse() : [0];

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Score %',
                data: scores,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

/**
 * Helpers
 */
function getActivityClass(type) {
    if (!type) return 'lesson';
    if (type.includes('purchase')) return 'purchase';
    if (type.includes('test')) return 'test';
    return 'lesson';
}

function getActivityLabel(type) {
    const map = {
        'test_passed': 'Passed Test',
        'test_failed': 'Attempted Test',
        'course_enrolled': 'Purchased',
        'lesson_completed': 'Completed Lesson'
    };
    return map[type] || 'Activity';
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showLiveNotification(msg) {
    const el = document.getElementById('liveNotif');
    if (el) {
        el.innerText = msg;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}
