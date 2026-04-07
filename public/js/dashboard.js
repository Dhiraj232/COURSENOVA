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
    const { user, stats, courses, books, recentActivities } = data;

    // Header & User Name Logic
    const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Learner');
    const firstName = displayName.split(' ')[0] || 'Learner';

    if (document.getElementById('studentFirstName')) {
        document.getElementById('studentFirstName').textContent = firstName;
    }
    if (document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').textContent = displayName;
    }
    if (document.getElementById('streakCounter')) {
        document.getElementById('streakCounter').textContent = `${stats.streak || 0} day`;
    }
    if (document.getElementById('userAvatar')) {
        document.getElementById('userAvatar').textContent = firstName.charAt(0).toUpperCase();
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
        if (el) el.textContent = val || 0;
    }

    // Paid vs Free Breakdowns
    if (document.getElementById('courseBreakdown')) {
        document.getElementById('courseBreakdown').textContent = `${stats.paidCourses} Paid • ${stats.freeCourses} Free`;
    }
    if (document.getElementById('testBreakdown')) {
        document.getElementById('testBreakdown').textContent = `${stats.paidTests} Paid • ${stats.freeTests} Free`;
    }
    
    // Time Spent Formatting (e.g. 12h 45m)
    const timeSpentEl = document.getElementById('timeSpentCount');
    if (timeSpentEl) {
        const totalMin = stats.totalTime || 0;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        timeSpentEl.textContent = (h > 0) ? `${h}h ${m}m` : `${m}m`;
    }

    // B. Progress Section (Last 3 active courses)
    const progressGrid = document.getElementById('courseProgressGrid');
    if (progressGrid) {
        const activeCourses = courses.slice(0, 3);
        progressGrid.innerHTML = activeCourses.map(c => `
            <div class="topic-item" style="margin-bottom: 15px;">
                <div class="topic-info" style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600;">
                    <span>${c.title}</span>
                    <span>${c.progress}%</span>
                </div>
                <div class="progress-bar-bg" style="width: 100%; height: 8px; background: rgba(0,0,0,0.05); border-radius: 99px; overflow: hidden; margin-top: 8px;">
                    <div class="progress-bar-fill" style="width: ${c.progress}%; height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 99px;"></div>
                </div>
            </div>
        `).join('') || '<p style="color: #64748b; font-size: 0.85rem;">No active courses found.</p>';
    }

    // C. Activity Timeline
    const timeline = document.getElementById('activityTimeline');
    if (timeline) {
        timeline.innerHTML = recentActivities.map(act => `
            <li class="activity-item" style="display: flex; gap: 15px; margin-bottom: 20px;">
                <div class="activity-icon-sm" style="width: 32px; height: 32px; background: rgba(99,102,241,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6366f1; flex-shrink: 0;">
                    <i class="fas ${getActivityIcon(act.type)}"></i>
                </div>
                <div class="activity-details">
                    <p style="margin: 0; font-size: 0.88rem; font-weight: 600;">${act.title}</p>
                    <span style="font-size: 0.75rem; color: #94a3b8;">${formatTime(act.timestamp)}</span>
                </div>
            </li>
        `).join('') || '<p style="color: #64748b; font-size: 0.85rem;">No recent activities.</p>';
    }

    // D. Performance Stats
    if (document.getElementById('avgScoreDisplay')) document.getElementById('avgScoreDisplay').textContent = `${stats.avgScore || 0}%`;
    if (document.getElementById('bestScoreDisplay')) document.getElementById('bestScoreDisplay').textContent = `${stats.bestScore || 0}%`;
    if (document.getElementById('accuracyDisplay')) document.getElementById('accuracyDisplay').textContent = `${stats.accuracy || 0}%`;

    // E. Default Library (Courses)
    renderLibrary('course', courses);
}

// Global cached items for tab switching
let dashboardData = null;

async function fetchDashboardOverview() {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    try {
        const res = await fetch('/api/analytics/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            dashboardData = data;
            updateDashboardUI(data);
            renderPerformanceChart(data.testResults);
        }
    } catch (err) {
        console.error('Failed to fetch dashboard:', err);
    }
}

function initLibraryTabs() {
    document.querySelectorAll('.lib-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.dataset.type;
            
            if (dashboardData) {
                if (type === 'course') renderLibrary('course', dashboardData.courses);
                else if (type === 'book') renderLibrary('book', dashboardData.books);
            }
        });
    });
}

function renderLibrary(type, items) {
    const list = document.getElementById('libraryContent');
    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 30px; color: #94a3b8;">
            <i class="fas ${type==='course'?'fa-play-circle':'fa-book'} fa-2x" style="margin-bottom:10px; opacity:0.3;"></i>
            <p style="font-size: 0.85rem;">No ${type}s found in your library.</p>
        </div>`;
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="lib-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 12px; border: 1px solid rgba(0,0,0,0.03); margin-bottom: 10px;">
            <div class="lib-icon" style="width: 40px; height: 40px; border-radius: 10px; background: white; display: flex; align-items: center; justify-content: center; color: #6366f1; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                <i class="fas ${type === 'course' ? 'fa-play-circle' : 'fa-book'}"></i>
            </div>
            <div class="lib-info">
                <h5 style="margin: 0; font-size: 0.88rem; font-weight: 700; color: #1e293b;">${item.title}</h5>
                <p style="margin: 0; font-size: 0.75rem; color: #6366f1; font-weight: 600;">${type === 'course' ? item.progress + '% Complete' : 'Purchased'}</p>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const map = {
        'test_passed': 'fa-check-circle',
        'test_failed': 'fa-times-circle',
        'course_enrolled': 'fa-shopping-cart',
        'lesson_completed': 'fa-play-circle'
    };
    return map[type] || 'fa-dot-circle';
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
