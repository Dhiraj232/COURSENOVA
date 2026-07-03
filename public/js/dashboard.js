/**
 * COURSENOVA DYNAMIC DASHBOARD ENGINE
 * Synchronizes stats, activity, and learning vaults in real-time.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    const user = typeof getAuthUser === 'function' ? getAuthUser() : JSON.parse(localStorage.getItem('user') || localStorage.getItem('coursenovaUser') || 'null');
    const role = localStorage.getItem('role');
    
    if (!token || !user) {
        window.location.href = 'signup.html?redirect=dashboard.html';
        return;
    }

    if (role === 'admin') {
        window.location.href = '/admin-dashboard';
        return;
    }

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
            let lastActiveCourse = null;
            let lastActiveTime = 0;

            // Fetch progress and track the most recently active course
            await Promise.all(data.courses.map(async (e) => {
                try {
                    const pRes = await fetch(`/api/course/progress?courseId=${encodeURIComponent(e.courseName)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const pData = await pRes.json();
                    if (pData.ok && pData.record) {
                        PROGRESS_MAP[e.courseName] = pData.record.progressPercent || 0;
                        COMPLETED_MAP[e.courseName] = pData.record.testPassed;
                        
                        const updateTime = new Date(pData.record.updatedAt).getTime();
                        if (updateTime > lastActiveTime) {
                            lastActiveTime = updateTime;
                            lastActiveCourse = e.courseName;
                        }
                    }
                } catch (err) {}
            }));

            // Render Continue Learning Banner if applicable
            const continueSec = document.getElementById('continueLearningSection');
            const continueCard = document.getElementById('continueLearningCard');
            const activeCourseName = lastActiveCourse || data.courses[0].courseName;

            if (activeCourseName && continueSec && continueCard) {
                const c = COURSES_MAP[activeCourseName] || {
                    id: activeCourseName,
                    title: activeCourseName,
                    icon: '🎓',
                    level: 'Beginner',
                    duration: 'Self-paced',
                    lessonCount: 3,
                    quizCount: 35,
                    description: 'Enrolled Course'
                };
                const progress = PROGRESS_MAP[activeCourseName] || 0;

                continueCard.innerHTML = `
                    <div class="continue-learning-card">
                        <div class="continue-info">
                            <div class="continue-icon">${c.icon}</div>
                            <div class="continue-details">
                                <h3>${c.title}</h3>
                                <p>${c.description || 'Resume your learning path from where you left off.'}</p>
                                <div class="continue-progress">
                                    <div class="continue-progress-bar">
                                        <div class="continue-progress-fill" style="width: ${progress}%"></div>
                                    </div>
                                    <span class="continue-progress-text">${progress}% complete</span>
                                </div>
                            </div>
                        </div>
                        <a href="course-content.html?course=${encodeURIComponent(c.id)}" class="btn-continue">
                            <i class="fas fa-play"></i> Resume Course
                        </a>
                    </div>
                `;
                continueSec.style.display = 'block';
            }

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
    const socketUrl = '/';
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
        // CALL NEW PRODUCTION API for General Dashboard Stats
        const dashRes = await fetch('/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
        const dashData = await dashRes.json();
        
        // CALL NEW PRODUCTION API for User-specific Stats
        const userStatsRes = await fetch('/api/user/dashboard-stats', { headers: { 'Authorization': `Bearer ${token}` } });
        const userStatsData = await userStatsRes.json();
        
        if (dashData.ok && userStatsData.ok) {
            updateDashboardUI(dashData, userStatsData.stats);
            if (statusDot) statusDot.style.background = '#10b981';
        }
    } catch (err) {
        console.error('Data Fetch Error:', err);
    }
}

/**
 * UI SYNC ENGINE - Matching User Requirements exactly
 */
function updateDashboardUI(data, userStats) {
    // Check if phone is missing
    if (!data.user.phone || data.user.phone === '') {
        showPhoneUpdateModal(data.user);
    }

    // A. Main Counters (Using User's Specific Names)
    setElText('enrolledCount', userStats.enrolledCourses || data.totalCourses);
    setElText('testsTakenCount', userStats.testsTaken || data.totalTests);
    setElText('mktBoughtCount', data.totalBooksBought);
    setElText('mktSold', data.totalBooksSold);
    setElText('mktRevenueDisplay', "₹" + (data.totalBooksRevenue || 0));

    // B. User Identity
    const displayName = data.user.name || "Learner";
    setElText('studentFirstName', displayName.split(' ')[0]);
    setElText('userNameDisplay', displayName);
    setElText('userAvatar', displayName.charAt(0).toUpperCase());

    // C. Gamification & Streak
    setElText('studentPoints', (userStats.points || 0) + " pts");
    setElText('userRank', "Rank #" + (userStats.rank || 'N/A'));
    setElText('streakDisplay', (userStats.streak || 0) + " Days");
    setElText('streakDisplayTop', (userStats.streak || 0) + " day");
    
    // D. Performance Analytics
    setElText('accuracyDisplay', (userStats.avgAccuracy || 0) + "%");
    if (userStats.recentTests && userStats.recentTests.length > 0) {
        const scores = userStats.recentTests.map(t => typeof t.score === 'number' ? Math.round(t.score) : 0);
        const bestScore = Math.max(...scores, 0);
        setElText('bestScoreDisplay', bestScore + "%");
        setElText('avgScoreDisplay', Math.round(userStats.avgAccuracy) + "%");
    }

    localTimeSpent = data.stats.totalTime || 0;
    updateTimeDisplay(localTimeSpent || data.stats.totalMinutes);

    // E. Recent Activity (Top 5)
    renderActivityTimeline(data.recentActivity || []);
    
    // F. Special Access UI
    updateAccessBadges(userStats.isPremium);

    // G. Referral Code Loader
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    if (token) {
        fetch('/api/referral/my-code', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(codeData => {
            if (codeData.ok && codeData.referralCode) {
                const referralInput = document.getElementById('referralCodeInput');
                if (referralInput) {
                    referralInput.value = codeData.referralCode;
                }
            }
        })
        .catch(err => console.warn('[Referral] Failed to fetch code:', err));
    }

    // H. Achievements rendering
    const badgeContainer = document.getElementById('achievementsBadgeContainer');
    if (badgeContainer) {
        const badgeList = [
            { name: 'Course Starter', icon: '🚀', unlocked: (userStats.enrolledCourses || 0) >= 1 },
            { name: 'Streak Master', icon: '🔥', unlocked: (userStats.streak || 0) >= 3 },
            { name: 'Point Collector', icon: '🪙', unlocked: (userStats.points || 0) >= 200 },
            { name: 'Quiz Champion', icon: '🏆', unlocked: (userStats.avgAccuracy || 0) >= 80 },
            { name: 'Elite Member', icon: '👑', unlocked: !!userStats.isPremium },
            { name: 'Super Scholar', icon: '🎓', unlocked: (userStats.points || 0) >= 1000 }
        ];
        
        badgeContainer.innerHTML = badgeList.map(b => `
            <div class="badge-item ${b.unlocked ? '' : 'locked'}" title="${b.unlocked ? 'Unlocked!' : 'Locked'}">
                <span class="badge-icon">${b.icon}</span>
                <span class="badge-name">${b.name}</span>
            </div>
        `).join('');
    }

    // I. Streak Week Calendar Visual
    const streak = userStats.streak || 0;
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1-6 is Mon-Sat
    const activeDays = new Set();
    if (streak > 0) {
        for (let i = 0; i < Math.min(streak, 7); i++) {
            let d = todayIndex - i;
            if (d < 0) d += 7;
            activeDays.add(d);
        }
    }
    const dayDots = document.querySelectorAll('#streakWeekVisual .day-dot');
    dayDots.forEach(dot => {
        const dayVal = parseInt(dot.getAttribute('data-day'));
        dot.classList.remove('active', 'today');
        if (activeDays.has(dayVal)) {
            dot.classList.add('active');
        }
        if (dayVal === todayIndex) {
            dot.classList.add('today');
        }
    });

    // J. Render My Mock Tests History inside Dynamic Vault
    const mocktestGrid = document.getElementById('vaultMockTest');
    if (mocktestGrid) {
        if (userStats.recentTests && userStats.recentTests.length > 0) {
            mocktestGrid.style.display = 'block';
            mocktestGrid.innerHTML = `
                <div style="width: 100%; overflow-x: auto; background: rgba(255, 255, 255, 0.6); border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); padding: 5px;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid rgba(0,0,0,0.06); color: #1e3a8a; font-weight: 700;">
                                <th style="padding: 12px 15px;">Exam Series</th>
                                <th style="padding: 12px 15px;">Set / Subject</th>
                                <th style="padding: 12px 15px;">Marks Obtained</th>
                                <th style="padding: 12px 15px;">Correct / Wrong</th>
                                <th style="padding: 12px 15px;">Accuracy</th>
                                <th style="padding: 12px 15px;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${userStats.recentTests.map(t => {
                                const correct = Number(t.correctQuestions) || 0;
                                const wrong = Number(t.incorrectQuestions) || 0;
                                const total = Number(t.totalQuestions) || 0;
                                const rawScore = (correct * 1.0) - (wrong * 0.25);
                                const accuracyVal = t.accuracy !== undefined ? Math.round(t.accuracy) : (correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 100);
                                
                                // Format setTitle nicely
                                let setTitle = t.courseId || 'Practice Set';
                                if (setTitle.includes('-')) {
                                    setTitle = setTitle.split('-').slice(1).join(' ').replace(/_/g, ' ');
                                }
                                if (setTitle.startsWith('daily_challenge_')) {
                                    setTitle = 'Daily Challenge';
                                }

                                return `
                                    <tr style="border-bottom: 1px solid rgba(0,0,0,0.04); transition: background 0.2s;">
                                        <td style="padding: 12px 15px; font-weight: 700; color: #1e293b;">${t.courseName || 'Practice'}</td>
                                        <td style="padding: 12px 15px; color: #475569; font-weight: 600; text-transform: capitalize;">${setTitle}</td>
                                        <td style="padding: 12px 15px; font-weight: 800; color: #1e3a8a;">${rawScore.toFixed(2)} <span style="font-size: 0.75rem; color:#94a3b8; font-weight:normal;">/ ${total}</span></td>
                                        <td style="padding: 12px 15px; font-weight: 700;">
                                            <span style="color:#10b981;">${correct} Correct</span> / 
                                            <span style="color:#ef4444;">${wrong} Wrong</span>
                                        </td>
                                        <td style="padding: 12px 15px; color: #6366f1; font-weight: 800;">${accuracyVal}%</td>
                                        <td style="padding: 12px 15px; color: #64748b; font-size: 0.8rem; font-weight: 500;">${new Date(t.timestamp).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            mocktestGrid.innerHTML = `
                <div style="padding: 30px; text-align: center; background: rgba(255,255,255,0.4); border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <p style="color:#64748b; font-weight: 500; margin-bottom: 15px;">No mock tests attempted yet.</p>
                    <a href="mock-tests.html" class="btn-sm-view" style="display:inline-block; text-decoration:none; padding: 8px 16px;">Start Your First Mock Test</a>
                </div>
            `;
        }
    }

    // K. Render My Books Catalog Placeholder
    const bookGrid = document.getElementById('vaultBooks');
    if (bookGrid) {
        bookGrid.innerHTML = `
            <div style="padding: 30px; text-align: center; background: rgba(255,255,255,0.4); border-radius: 16px; border: 1px dashed #cbd5e1;">
                <p style="color:#64748b; font-weight: 500; margin-bottom: 15px;">No books or study notes purchased yet.</p>
                <a href="store.html" class="btn-sm-view" style="display:inline-block; text-decoration:none; padding: 8px 16px;">Browse Study Store</a>
            </div>
        `;
    }
}

function showPhoneUpdateModal(user) {
    // Remove existing modal if any
    const old = document.getElementById('phoneUpdateModal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'phoneUpdateModal';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.95); z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(10px);
    `;

    overlay.innerHTML = `
        <div style="background: #1e293b; padding: 40px; border-radius: 24px; width: 100%; max-width: 450px; border: 1px solid rgba(255,255,255,0.1); text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
            <div style="width: 70px; height: 70px; background: #6366f1; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; font-size: 2rem; color: white;">
                <i class="fas fa-mobile-screen-button"></i>
            </div>
            <h2 style="color: white; margin-bottom: 10px; font-family: 'Outfit', sans-serif;">Complete Your Profile</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 30px;">
                Hey <strong>${user.name.split(' ')[0]}</strong>, please provide your mobile number to access the dashboard and premium resources.
            </p>
            <div style="text-align: left; margin-bottom: 25px;">
                <label style="display: block; color: #f1f5f9; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Mobile Number</label>
                <div style="position: relative;">
                    <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 700;">+91</span>
                    <input type="tel" id="userPhoneInput" maxlength="10" placeholder="10-digit number" 
                        style="width: 100%; padding: 14px 14px 14px 50px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: white; font-size: 1.1rem; outline: none; transition: 0.3s;"
                        oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>
                <p id="phoneError" style="color: #f87171; font-size: 0.75rem; margin-top: 8px; display: none;">Please enter a valid 10-digit mobile number.</p>
            </div>
            <button onclick="saveUserPhone()" style="width: 100%; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                Confirm & Continue <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
            </button>
            <p style="margin-top: 20px; font-size: 0.75rem; color: #475569;">Your information is secure with COURSENOVA.</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function saveUserPhone() {
    const phone = document.getElementById('userPhoneInput').value;
    const errorEl = document.getElementById('phoneError');
    const token = localStorage.getItem('token') || localStorage.getItem('coursenovaToken');

    if (phone.length !== 10) {
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    try {
        const res = await fetch('/api/user/update-phone', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (data.ok) {
            // Update local storage user data too
            const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('coursenovaUser'));
            user.phone = phone;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('coursenovaUser', JSON.stringify(user));
            
            document.getElementById('phoneUpdateModal').remove();
            showLiveNotification("Profile updated successfully!");
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        alert("Failed to save phone. Please try again.");
    }
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

// Copy Referral Code to Clipboard
window.copyReferralCode = function(event) {
    if (event) event.preventDefault();
    const referralInput = document.getElementById('referralCodeInput');
    if (!referralInput || referralInput.value === 'LOADING...') return;
    
    referralInput.select();
    referralInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(referralInput.value)
        .then(() => {
            showLiveNotification("Referral code copied to clipboard!");
        })
        .catch(() => {
            try {
                document.execCommand('copy');
                showLiveNotification("Referral code copied to clipboard!");
            } catch (err) {
                console.error('[Referral] Copy failed:', err);
            }
        });
};

