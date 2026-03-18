/**
 * ==================== RENVOX DASHBOARD LOGIC ====================
 * 
 * This file handles fetching analytics from the backend, updating the 
 * dashboard UI components, and initializing Chart.js visualizations.
 */

document.addEventListener('DOMContentLoaded', function () {
    if (checkAuthentication()) {
        // Track Login Event in Analytics
        if (window.RenvoxAnalytics) {
            RenvoxAnalytics.trackLogin();
        }
        fetchDashboardData();
    }
});

/**
 * Check if the user is logged in, otherwise redirect.
 */
function checkAuthentication() {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    const user = localStorage.getItem('renvoxUser') || localStorage.getItem('renvox_user');

    if (!token || !user) {
        console.warn('Authentication token not found. Redirecting to login...');
        window.location.href = 'signup.html?redirect=dashboard.html';
        return false;
    }
    return true;
}

/**
 * Fetch analytics and stats from the Express API
 */
async function fetchDashboardData() {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');

    try {
        const response = await fetch('/api/analytics/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Cloud sync failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
            updateDashboardUI(data);
            initializeCharts(data);
        } else {
            console.error('API returned error:', data.message);
            // Even if API fails, we can show mock charts for aesthetic purposes
            initializeCharts(null);
        }
    } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        // Fallback for offline or dev mode
        initializeCharts(null);
    }
}

/**
 * Update the DOM elements with real analytics data
 */
function updateDashboardUI(data) {
    const { user, stats, recentActivities, weakTopics, courses } = data;

    // Header & Personalization
    const studentFirstName = user.name ? user.name.split(' ')[0] : 'Learner';
    document.getElementById('studentFirstName').innerText = studentFirstName;
    document.getElementById('userNameDisplay').innerText = user.name;
    document.getElementById('streakCounter').innerText = `${stats.streak} day`;

    // Stats Ribbon
    document.getElementById('enrolledCount').innerText = stats.totalCourses || 0;
    document.getElementById('certificatesCount').innerText = stats.certificates || 0;
    const rawT = stats.totalTime || 0;
    const initialHours = Math.floor(rawT / 60);
    const initialMins = rawT % 60;
    document.getElementById('timeSpentCount').innerText = (initialHours > 0) ? `${initialHours}h ${initialMins}m` : `${initialMins}m`;
    document.getElementById('avgScoreCount').innerText = `${stats.avgScore}%`;

    // 1. Topic Mastery / Weak Topics List
    const topicGrid = document.getElementById('topicGrid');
    if (topicGrid && courses && courses.length > 0) {
        topicGrid.innerHTML = courses.map(c => `
            <div class="topic-item">
                <div class="topic-info">
                    <span>${c.title}</span>
                    <span>${c.progress}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${c.progress}%; background: ${getTopicColor(c.progress)}"></div>
                </div>
            </div>
        `).join('') || '<p style="color: grey">Finish a module to see progress.</p>';

        // Add weak topics if any
        if (weakTopics && weakTopics.length > 0) {
            const weakBox = document.createElement('div');
            weakBox.style.marginTop = '20px';
            weakBox.innerHTML = `<h3 style="color:#ef4444; font-size:1rem;">Recommended Practice:</h3><p style="font-size:0.85rem">${weakTopics.join(', ')}</p>`;
            topicGrid.appendChild(weakBox);
        }
    }

    // 2. Recent Activity Feed
    const activityList = document.getElementById('activityList');
    if (activityList && recentActivities && recentActivities.length > 0) {
        activityList.innerHTML = recentActivities.slice(0, 5).map(act => `
            <li>
                <div class="activity-dot ${getActivityColorClass(act.type)}"></div>
                <div class="activity-text">
                    <p><strong>${getActivityLabel(act.type)}:</strong> ${act.title}</p>
                    <span>${formatActivityTime(act.timestamp)}</span>
                </div>
            </li>
        `).join('');
    }

    // 3. Continue Learning Section (Active Course)
    const activeCourseBox = document.getElementById('activeCourse');
    if (activeCourseBox && courses && courses.length > 0) {
        // Find most recently accessed course that isn't finished
        const sorted = courses.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
        const active = sorted.find(c => c.progress < 100) || sorted[0];

        if (active) {
            activeCourseBox.innerHTML = `
                <div class="course-mini">
                    <div class="course-icon"><i class="fas fa-play"></i></div>
                    <div class="course-details">
                        <h4>${active.title}</h4>
                        <p>Progress: ${active.progress}%</p>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${active.progress}%;"></div>
                        </div>
                    </div>
                    <button class="btn-resume" onclick="window.location.href='course-content.html?course=${active.id}&t=${Date.now()}'">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
        }
    }

    // Avatar Initial
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.name) {
        userAvatar.innerText = user.name.charAt(0).toUpperCase();
        if (user.avatar) {
            userAvatar.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    }
}

/**
 * Activity Type Labels
 */
function getActivityLabel(type) {
    const labels = {
        'lesson_completed': 'Finished Lesson',
        'test_passed': 'Passed Test',
        'test_failed': 'Failed Test',
        'certificate_earned': 'Earned Certificate',
        'quiz_completed': 'Practice Quiz',
        'login': 'Account Login',
        'course_enrolled': 'New Course Joined'
    };
    return labels[type] || 'Activity';
}

function getActivityColorClass(type) {
    if (type.includes('passed') || type.includes('earned') || type === 'course_enrolled') return 'green';
    if (type.includes('failed')) return 'red';
    return 'blue';
}

function formatActivityTime(ts) {
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

/**
 * Determine progress bar color based on mastery percentage
 */
function getTopicColor(score) {
    if (score >= 80) return 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'; // Green
    if (score >= 60) return 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'; // Blue
    return 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';                   // Orange
}

/**
 * Initialize Chart.js Graphs
 */
function initializeCharts(data) {
    // 1. Weekly Activity Chart
    const weeklyCtx = document.getElementById('weeklyActivityChart');
    if (weeklyCtx) {
        const labels = data ? data.weeklyActivity.map(i => i.day) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const values = data ? data.weeklyActivity.map(i => i.minutes) : [30, 45, 15, 60, 20, 10, 0];

        window.liveChartInstance = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes Spent',
                    data: values,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: true, color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Outfit', weight: '600' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Outfit', weight: '600' } }
                    }
                }
            }
        });
        liveChartInstance = window.liveChartInstance;
    }

    // 2. Performance Radar Chart
    const radarCtx = document.getElementById('performanceRadarChart');
    if (radarCtx) {
        const topicLabels = (data && data.courses && data.courses.length > 0)
            ? data.courses.slice(0, 5).map(t => t.title.substring(0, 10))
            : ['DSA', 'Web Dev', 'Java', 'AI', 'Logic'];
        const topicScores = (data && data.courses && data.courses.length > 0)
            ? data.courses.slice(0, 5).map(t => t.progress)
            : [85, 72, 60, 45, 90];

        new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: topicLabels,
                datasets: [{
                    label: 'Mastery Level',
                    data: topicScores,
                    fill: true,
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    borderColor: 'rgba(168, 85, 247, 1)',
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: { line: { borderWidth: 3 } },
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        angleLines: { display: false },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: { display: false }
                    }
                }
            }
        });
    }
}

// LIVE TRACKING
let liveChartInstance = null;
setInterval(async () => {
    const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token');
    if (!token) return;
    try {
        const res = await fetch('/api/analytics/track-time', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.ok) {
            // Live update visual timer label
            const hours = Math.floor(d.totalTime / 60);
            const rMin = d.totalTime % 60;
            const text = (hours > 0) ? `${hours}h ${rMin}m` : `${rMin}m`;
            document.getElementById('timeSpentCount').innerText = text;

            // Live update graph array
            if (liveChartInstance) {
                liveChartInstance.data.datasets[0].data = d.weeklyActivity.map(i => i.minutes);
                liveChartInstance.update();
            }
        }
    } catch(e) {}
}, 60000); // every minute
