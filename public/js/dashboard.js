/**
 * COURSENOVA DYNAMIC DASHBOARD ENGINE
 * Synchronizes stats, activity, and learning vaults in real-time.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_user_token');
    const userStr = localStorage.getItem('coursenovaUser') || localStorage.getItem('coursenova_user');
    
    if (!token || !userStr) {
        window.location.href = 'signup.html?redirect=dashboard.html';
        return;
    }

    const user = JSON.parse(userStr);
    const userId = user.id || user._id;

    // 1. Initialize Sockets & Live Hub
    initLiveSystem(userId, token);


    // 2. Initial Data Pull from Production-Ready Endpoint
    initDashboardData(token);

    // 3. Tab Navigation Logic
    initLibraryTabs();
});

let socket;
let localTimeSpent = 0;
let COURSES_MAP = {};
let PROGRESS_MAP = {};
let COMPLETED_MAP = {};

async function initDashboardData(token) {
    await fetchMasterCourses();
    await fetchDashboardOverview(token);
    await loadVaultCourses(token);
}

async function fetchMasterCourses() {
    try {
        const res = await fetch('/api/premium/courses');
        const data = await res.json();
        if (data.ok) {
            data.courses.forEach(c => {
                COURSES_MAP[c.slug || c._id] = {
                    id: c.slug || c._id,
                    title: c.title,
                    icon: c.icon || '🎓',
                    level: c.level || 'Beginner',
                    duration: c.duration || '25 Hours',
                    lessonCount: (c.lessons || []).length || 3,
                    quizCount: (c.quizQuestions || []).length || 35,
                    description: c.description || 'Master this subject with in-depth modules.'
                };
            });
        }
    } catch (e) { console.warn("Vault: Course metadata sync skipped."); }
}

async function loadVaultCourses(token) {
    const grid = document.getElementById('vaultCourses');
    if (!grid) return;

    try {
        const res = await fetch('/api/enrollments/my-courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.ok && data.courses.length > 0) {
            // Fetch progress
            await Promise.all(data.courses.map(async (e) => {
                try {
                    const pRes = await fetch(`/api/course/progress?courseId=${encodeURIComponent(e.courseName)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const pData = await pRes.json();
                    if (pData.ok && pData.record) {
                        PROGRESS_MAP[e.courseName] = pData.record.progressPercent || 0;
                        COMPLETED_MAP[e.courseName] = pData.record.testPassed;
                    }
                } catch (err) {}
            }));

            grid.innerHTML = data.courses.map(e => {
                const c = COURSES_MAP[e.courseName] || {
                    id: e.courseName,
                    title: e.courseName,
                    icon: '🎓',
                    level: 'Beginner',
                    duration: 'Self-paced',
                    lessonCount: 0,
                    quizCount: 0,
                    description: 'Enrolled Course'
                };
                return buildStandardCard(c);
            }).join('');
        } else {
            grid.innerHTML = `<p style="color:#64748b; padding:20px;">No courses found in your vault.</p>`;
        }
    } catch (err) { console.error("Vault Error:", err); }
}

function buildStandardCard(c) {
    const progress = PROGRESS_MAP[c.id] || 0;
    const completed = !!COMPLETED_MAP[c.id];
    
    const badge = completed 
        ? `<span class="status-badge"><i class="fas fa-check-circle"></i> Completed</span>`
        : `<span class="status-badge"><i class="fas fa-graduation-cap"></i> Enrolled</span>`;

    const btnText = completed ? 'Review content' : 'Continue learning';
    
    return `
    <div class="course-card">
        <div class="card-header ${c.level.toLowerCase()}">
            ${badge}
            <div class="course-icon">${c.icon}</div>
            <div class="course-title">${c.title}</div>
        </div>
        <div class="card-body">
            <p class="course-desc">${c.description}</p>
            <div class="course-meta">
                <span class="meta-tag"><i class="fas fa-clock"></i> ${c.duration}</span>
                <span class="meta-tag"><i class="fas fa-circle-play"></i> ${c.lessonCount} Videos</span>
                <span class="meta-tag">${c.quizCount} MCQs</span>
            </div>
            <ul class="highlights-mini">
                <li>Expert Training</li>
                <li>Certification</li>
            </ul>
            <div class="progress-wrap">
                <div class="progress-label"><span>Progress</span><span>${progress}%</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            </div>
            <a href="course-content.html?course=${encodeURIComponent(c.id)}" class="btn-action-vault">
                ${btnText}
            </a>
        </div>
    </div>`;
}

/**
 * PRODUCTION-READY SOCKET SYSTEM
 */
function initLiveSystem(userId, token) {
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/' 
        : 'https://www.coursenova.in';
    socket = io(socketUrl);

    socket.on('connect', () => {
        const cleanId = String(userId).replace(/['"]+/g, '');
        socket.emit('identify', cleanId);
    });

    // REFRESH ON ALL PLATFORM EVENTS
    socket.on('dashboard_update', (data) => {
        console.log("⚡ [Live] Refreshing data for event:", data.type);
        showLiveNotification(data.message || "Learning progress updated!");
        fetchDashboardOverview(token); // Silent refresh
    });

    // Local heartbeat timer
    setInterval(() => {
        localTimeSpent++;
        updateTimeDisplay(localTimeSpent);
    }, 60000);

    // Official sync every 60s
    setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        try {
            const res = await fetch('/api/analytics/heartbeat', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok) {
                setElText('streakDisplay', data.streak + " Days");
                localTimeSpent = data.totalTime;
                updateTimeDisplay(localTimeSpent);
            }
        } catch (e) { console.warn("Sync: Hub briefly unreachable."); }
    }, 60000);
}

/**
 * THE DATA ENGINE
 */
async function fetchDashboardOverview(token) {
    // Show loading state on status dot
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) statusDot.style.background = '#fbbf24';

    try {
        // CALL NEW PRODUCTION API
        const res = await fetch('/api/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.ok) {
            updateDashboardUI(data);
            if (statusDot) statusDot.style.background = '#10b981';
        }
    } catch (err) {
        console.error('Data Fetch Error:', err);
    }
}

/**
 * UI SYNC ENGINE - Matching User Requirements exactly
 */
function updateDashboardUI(data) {
    // A. Main Counters (Using User's Specific Names)
    setElText('enrolledCount', data.totalCourses);
    setElText('testsTakenCount', data.totalTests);
    setElText('mktBoughtCount', data.totalBooksBought);
    setElText('mktSold', data.totalBooksSold);
    setElText('mktRevenueDisplay', "₹" + (data.totalBooksRevenue || 0));

    // B. User Identity
    const displayName = data.user.name || "Learner";
    setElText('studentFirstName', displayName.split(' ')[0]);
    setElText('userNameDisplay', displayName);
    setElText('userAvatar', displayName.charAt(0).toUpperCase());

    // C. Gamification & Streak
    setElText('studentPoints', (data.user.points || 0) + " pts");
    setElText('userRank', "Rank #" + (data.user.rank || 'Unranked'));
    setElText('streakDisplay', (data.stats.streak || 0) + " Days");
    
    localTimeSpent = data.stats.totalTime || 0;
    updateTimeDisplay(localTimeSpent || data.stats.totalMinutes);

    // D. Library & Vault Rendering
    // Still support rendering the vaults if lists are present (for the library tabs)
    // Note: If vault sections need courses/books list, we can add them to the /api/dashboard later
    // For now, these rely on standard enrollment data often cached or fetched separately
    // But since we want "Dynamic", we'll ensure the counts are correctly mapped to existing tags.
    
    // E. Recent Activity (Top 5)
    renderActivityTimeline(data.recentActivity || []);
    
    // F. Special Access UI
    updateAccessBadges(data.user.mockTestAccess);
}

function renderActivityTimeline(activities) {
    const list = document.getElementById('activityTimeline');
    if (!list) return;

    if (activities.length === 0) {
        list.innerHTML = `<p style="color:#94a3b8; font-size:0.8rem;">Ready to start learning?</p>`;
        return;
    }

    list.innerHTML = activities.map(act => `
        <li class="activity-item" style="display: flex; gap: 12px; margin-bottom: 12px; animation: slideIn 0.3s ease-out;">
            <div style="width: 30px; height: 30px; background: ${getActivityBg(act.type)}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${getActivityColor(act.type)};">
                <i class="fas ${getActivityIcon(act.type)}"></i>
            </div>
            <div style="display: flex; flex-direction: column;">
                <p style="margin: 0; font-size: 0.82rem; font-weight: 600; color: #1e293b;">${act.title}</p>
                <span style="font-size: 0.65rem; color: #94a3b8;">${new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </li>
    `).join('');
}

function updateAccessBadges(hasAccess) {
    const el = document.getElementById('mockTestBadge');
    if (el) {
        el.className = hasAccess ? 'badge-unlocked' : 'badge-locked';
        el.innerHTML = `<i class="fas ${hasAccess ? 'fa-check' : 'fa-lock'}"></i> ${hasAccess ? 'UNLOCKED' : 'LOCKED'}`;
    }
}

function updateTimeDisplay(mins) {
    const el = document.getElementById('timeSpentCount');
    if (!el) return;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    el.innerText = (h > 0) ? `${h}h ${m}m` : `${m}m`;
}

function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function initLibraryTabs() {
    const tabs = document.querySelectorAll('.lib-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Logic for switching display grids would go here
        });
    });
}

function showLiveNotification(msg) {
    const toast = document.createElement('div');
    toast.className = 'dashboard-notif';
    toast.innerHTML = `<i class="fas fa-bolt"></i> ${msg}`;
    toast.style.cssText = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1e293b; color:white; padding:12px 24px; border-radius:50px; z-index:9999; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation: fadeInUp 0.5s ease;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 1000); }, 4000);
}

// Helpers for icons and colors
function getActivityIcon(type) {
    const map = { 'course_enrolled': 'fa-graduation-cap', 'test_passed': 'fa-check-circle', 'test_failed': 'fa-times-circle', 'book_purchased': 'fa-shopping-bag', 'book_uploaded': 'fa-cloud-upload-alt', 'book_sold': 'fa-coins' };
    return map[type] || 'fa-star';
}
function getActivityBg(type) { return type.includes('passed') || type.includes('sold') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'; }
function getActivityColor(type) { return type.includes('passed') || type.includes('sold') ? '#059669' : '#6366f1'; }
