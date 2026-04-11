/**
 * ==================== COURSENOVA REAL-TIME DASHBOARD ====================
 * Handles Socket.io events, telemetry tracking, and dynamic UI updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
    const userStr = localStorage.getItem('coursenovaUser') || localStorage.getItem('coursenova_user');
    
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
    fetchWeeklyActivity();

    // 3. Telemetry Logic (Heartbeat)
    initTelemetry();

    // 4. Library Tab Logic
    initLibraryTabs();
});

let socket;
function initSockets(userId) {
    const socketUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? (window.location.port === '5000' ? '' : 'http://localhost:5000')
        : window.location.origin;

    console.log('🔌 Connecting to Live Engine:', socketUrl || 'Same-origin');

    socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        timeout: 20000
    });

    socket.on('connect', () => {
        console.log('✅ Live Engine Connected | Socket ID:', socket.id);
        const cleanId = String(userId).replace(/['"]+/g, '');
        socket.emit('identify', cleanId);
    });

    socket.on('dashboard_update', (data) => {
        console.log('🚀 Live Update:', data);
        if (data.type === 'CONNECTION_STABLE') {
            const indicator = document.querySelector('.live-indicator');
            if (indicator) indicator.style.color = '#10b981';
        } else {
            showLiveNotification(data.message, data.type);
            fetchDashboardOverview();
            fetchWeeklyActivity();
        }
    });

    socket.on('connect_error', (err) => {
        console.warn('❌ Socket Connection Error:', err.message);
        const indicator = document.querySelector('.live-indicator');
        if (indicator) indicator.style.color = '#ef4444';
    });
}

/**
 * Telemetry Heartbeat - Tracks active learning time every 60 seconds
 */
function initTelemetry() {
    console.log('🛰️ Telemetry Heartbeat Started');
    setInterval(async () => {
        // Only track if tab is active to ensure accuracy
        if (document.visibilityState === 'visible') {
            const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
            try {
                const res = await fetch('/api/analytics/heartbeat', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.ok) {
                    console.log('💓 Heartbeat ack:', data.totalTime, 'min');
                    updateTimeDisplay(data.totalTime);
                    if (data.streak) updateStreakDisplay(data.streak);
                }
            } catch (err) {
                console.warn('Heartbeat telemetry failed');
            }
        }
    }, 60000); // 1 minute
}

/**
 * Fetch Comprehensive Dashboard Data
 */
let dashboardData = null;
async function fetchDashboardOverview() {
    const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
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

async function fetchWeeklyActivity() {
    const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
    try {
        const res = await fetch('/api/analytics/weekly', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            renderWeeklyActivityChart(data.data);
        }
    } catch (err) {
        console.error('Failed to fetch weekly activity:', err);
    }
}

function updateDashboardUI(data) {
    const { user, stats, courses, books, recentActivities } = data;

    // Header updates
    const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Learner');
    const firstName = displayName.split(' ')[0] || 'Learner';

    setElText('studentFirstName', firstName);
    setElText('userNameDisplay', displayName);
    setElText('userAvatar', firstName.charAt(0).toUpperCase());
    
    updateStreakDisplay(stats.streak);
    updateTimeDisplay(stats.totalTime);

    // Primary Stats
    setElText('enrolledCount', stats.totalCourses);
    setElText('testsTakenCount', stats.totalTestsTaken);

    // Marketplace Stats
    setElText('mktEarnings', `₹${stats.marketplace?.earnings || 0}`);
    setElText('mktListed', stats.marketplace?.listed || 0);
    setElText('mktSold', stats.marketplace?.sold || 0);

    // Progress Section
    const progressGrid = document.getElementById('courseProgressGrid');
    if (progressGrid) {
        const activeCourses = courses.slice(0, 3);
        progressGrid.innerHTML = activeCourses.map(c => `
            <div class="topic-item" style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; color: #1e293b;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">${c.title}</span>
                    <span style="color: #6366f1;">${c.progress}%</span>
                </div>
                <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 10px; margin-top: 5px; overflow: hidden;">
                    <div style="width: ${c.progress}%; height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 10px; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `).join('') || '<p style="color: #94a3b8; font-size: 0.8rem;">No active courses.</p>';
    }

    // Timeline update
    const timeline = document.getElementById('activityTimeline');
    if (timeline) {
        timeline.innerHTML = recentActivities.map(act => `
            <li class="activity-item" style="display: flex; gap: 12px; margin-bottom: 15px;">
                <div class="activity-icon-sm" style="width: 32px; height: 32px; background: ${getActivityBg(act.type)}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${getActivityColor(act.type)}; flex-shrink: 0;">
                    <i class="fas ${getActivityIcon(act.type)}"></i>
                </div>
                <div class="activity-details" style="display: flex; flex-direction: column;">
                    <p style="margin: 0; font-size: 0.85rem; font-weight: 600; color: #334155;">${act.title}</p>
                    <span style="font-size: 0.7rem; color: #94a3b8;">${formatTime(act.timestamp)}</span>
                </div>
            </li>
        `).join('') || '<p style="color: #94a3b8; font-size: 0.8rem;">No recent activities.</p>';
    }

    updatePerformanceStats(stats);
    
    // Render My Learning Vault
    renderCoursesVault(courses);
    renderMockTestVault(data.mockTestAccess);
    renderBooksVault(books);
}

function updatePerformanceStats(stats) {
    setElText('avgScoreDisplay', `${stats.avgScore || 0}%`);
    setElText('bestScoreDisplay', `${stats.bestScore || 0}%`);
    setElText('accuracyDisplay', `${stats.accuracy || 0}%`);
}

function updateStreakDisplay(streak) {
    setElText('streakCounter', `${streak || 0} day`);
    setElText('streakDisplay', `${streak || 0} Days`);
}

function updateTimeDisplay(totalMin) {
    const el = document.getElementById('timeSpentCount');
    if (el) {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        el.textContent = (h > 0) ? `${h}h ${m}m` : `${m}m`;
    }
}

/** 
 * UI Helpers 
 */
function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatTime(ts) {
    if (!ts) return 'just now';
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getActivityIcon(type) {
    const map = {
        'test_passed': 'fa-check-circle',
        'test_failed': 'fa-times-circle',
        'course_enrolled': 'fa-cart-plus',
        'lesson_completed': 'fa-play-circle',
        'book_uploaded': 'fa-book',
        'book_sold': 'fa-hand-holding-usd',
        'book_purchased': 'fa-shopping-bag'
    };
    return map[type] || 'fa-dot-circle';
}

function getActivityBg(type) {
    if (type?.includes('passed') || type?.includes('sold')) return 'rgba(16, 185, 129, 0.1)';
    if (type?.includes('failed')) return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(99, 102, 241, 0.1)';
}

function getActivityColor(type) {
    if (type?.includes('passed') || type?.includes('sold')) return '#10b981';
    if (type?.includes('failed')) return '#ef4444';
    return '#6366f1';
}

/**
 * Charts Logic 
 */
let perfChart = null;
function renderPerformanceChart(results) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    if (perfChart) perfChart.destroy();
    
    const limitedResults = [...results].reverse().slice(-10);
    const labels = limitedResults.map((_, i) => `Test ${i + 1}`);
    const scores = limitedResults.map(r => r.score);

    perfChart = new Chart(ctx, {
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
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

let weeklyChart = null;
function renderWeeklyActivityChart(weeklyData) {
    const ctx = document.getElementById('weeklyActivityChart')?.getContext('2d');
    if (!ctx || !weeklyData) return;
    if (weeklyChart) weeklyChart.destroy();

    const labels = weeklyData.map(d => d.date);
    const values = weeklyData.map(d => d.count);

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Minutes',
                data: values,
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { stepSize: 10 } },
                x: { grid: { display: false } }
            }
        }
    });
}

/**
 * Dynamic Vault Renderers
 */
function renderCoursesVault(courses) {
    const list = document.getElementById('vaultCourses');
    if (!list) return;

    if (!courses || courses.length === 0) {
        list.innerHTML = `<p style="grid-column:1/-1; color:#94a3b8;">You haven't enrolled in any courses yet. <a href="certificates.html" style="color:#6366f1;">Explore Courses</a></p>`;
        return;
    }

    list.innerHTML = courses.map((c, idx) => {
        // Bonus Feature: Highlight recently accessed course (first element)
        const isRecent = idx === 0;
        const cardClass = isRecent ? 'vault-card vault-card-featured' : 'vault-card';

        return `
        <div class="${cardClass}">
            ${c.thumbnail 
                ? `<img src="${c.thumbnail}" class="vault-cover" alt="Course Thumbnail">` 
                : `<div class="vault-cover"><i class="fas fa-video ${isRecent ? 'fa-4x' : 'fa-2x'}" style="color:#a855f7"></i></div>`
            }
            <div style="display:flex; flex-direction:column; gap:10px; padding: ${isRecent ? '10px 0' : '0'}">
                ${isRecent ? `<div style="color:#ef4444; font-weight:800; font-size:0.75rem; letter-spacing:1px; text-transform:uppercase;"><i class="fas fa-history"></i> Pick up where you left off</div>` : ''}
                <h4 class="vault-title" style="${isRecent ? 'font-size:1.6rem;' : ''}">${c.title}</h4>
                <div style="font-size:0.85rem; color:#64748b; margin-top: -5px;">Progress: ${c.progress}%</div>
                <div class="vault-progress-container">
                    <div class="vault-progress-fill" style="width: ${c.progress}%"></div>
                </div>
                <a href="premium-course-player.html?course=${c.id}" class="vault-btn vault-btn-primary" style="${isRecent ? 'width: auto; padding: 12px 30px; align-self: flex-start;' : ''}">
                    ${c.progress === 100 ? '<i class="fas fa-certificate"></i> View Course' : '<i class="fas fa-play"></i> Resume Lesson'}
                </a>
            </div>
        </div>
        `;
    }).join('');
}

function renderMockTestVault(hasAccess) {
    const list = document.getElementById('vaultMockTest');
    if (!list) return;

    if (hasAccess) {
        list.innerHTML = `
            <div class="vault-card">
                <div class="vault-cover" style="background:#f0fdf4; display:flex; align-items:center; justify-content:center; color:#10b981;">
                    <i class="fas fa-check-circle fa-4x"></i>
                </div>
                <h4 class="vault-title">State Board Master Series</h4>
                <p style="font-size:0.85rem; color:#64748b;">Full Access to 15+ Boards</p>
                <div style="flex-grow:1"></div>
                <a href="mock-test-hub.html" class="vault-btn vault-btn-primary" style="background:#10b981;">
                    <i class="fas fa-vial"></i> Start Testing
                </a>
            </div>
        `;
    } else {
        list.innerHTML = `
            <div class="vault-card">
                <div class="vault-cover" style="background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8;">
                    <i class="fas fa-lock fa-4x"></i>
                </div>
                <h4 class="vault-title">State Board Master Series</h4>
                <p style="font-size:0.85rem; color:#64748b;">Unlock all 15+ State Boards instantly.</p>
                <div style="flex-grow:1"></div>
                <a href="mock-test-hub.html" class="vault-btn vault-btn-primary">
                    <i class="fas fa-shopping-cart"></i> Unlock Now (₹59)
                </a>
            </div>
        `;
    }
}

function renderBooksVault(books) {
    const list = document.getElementById('vaultBooks');
    if (!list) return;

    if (!books || books.length === 0) {
        list.innerHTML = `<p style="grid-column:1/-1; color:#94a3b8;">You don't own any books yet. <a href="store.html" style="color:#6366f1;">Visit Store</a></p>`;
        return;
    }

    list.innerHTML = books.map(b => `
        <div class="vault-card">
            ${b.images && b.images.length > 0 ? `<img src="${b.images[0].imageUrl}" class="vault-cover" alt="Book Cover" style="object-fit:contain; background:white;">` : `<div class="vault-cover" style="display:flex; align-items:center; justify-content:center; color:#a855f7;"><i class="fas fa-book fa-3x"></i></div>`}
            <h4 class="vault-title" style="margin-top:10px">${b.title}</h4>
            <div style="flex-grow:1"></div>
            <a href="${b.samplePdf || '#'}" target="_blank" class="vault-btn vault-btn-primary" style="background:#6366f1;">
                <i class="fas fa-book-reader"></i> Read Full Book
            </a>
        </div>
    `).join('');
}

function showLiveNotification(msg, type) {
    const el = document.getElementById('liveNotif');
    if (!el) return;
    
    const icon = type?.includes('SUCCESS') || type?.includes('PASSED') ? '✅' : '🔔';
    el.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">
        <span>${icon}</span>
        <span>${msg}</span>
    </div>`;
    
    el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); }, 6000);
}
