/**
 * COURSENOVA - Professional Admin Panel Logic
 */

const API_BASE = '/api/admin';

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initNavigation();
    loadView('dashboard');
});

function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const role = localStorage.getItem('role');

    if (!token || !userStr || role !== 'admin') {
        window.location.href = '/admin-login';
        return;
    }

    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
            window.location.href = '/admin-login';
        }
    } catch (e) {
        window.location.href = '/admin-login';
    }
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.getAttribute('data-view');
            loadView(view);
        });
    });

    const logoutBtn = document.getElementById('adminLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.clear();
                window.location.href = '/admin-login';
            }
        });
    }
}

async function fetchData(url) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) {
        console.error(`API Error (${url}):`, data);
        throw new Error(data.message || 'Failed to fetch data');
    }
    return data;
}

async function getFetchErrorMessage(res) {
    try {
        const text = await res.clone().text();
        try {
            const data = JSON.parse(text);
            return data.message || `Error ${res.status}: ${res.statusText || 'Server Error'}`;
        } catch {
            if (text.includes('<title>')) {
                const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
                if (titleMatch) return `Error ${res.status}: ${titleMatch[1].trim()}`;
            }
            return `Error ${res.status}: ${res.statusText || 'Server Error'}`;
        }
    } catch {
        return `Error ${res.status}: ${res.statusText || 'Server Error'}`;
    }
}

async function loadView(view) {
    const contentArea = document.getElementById('content-area');
    const title = document.getElementById('view-title');
    if (!contentArea) return;

    contentArea.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching ${view} data...</p></div>`;

    try {

        switch (view) {
            case 'dashboard':
                title.textContent = 'Dashboard Overview';
                const statsData = await fetchData(`${API_BASE}/stats`);
                renderDashboard(statsData.stats);
                break;

            case 'courses':
                title.textContent = 'Course Management';
                const coursesData = await fetchData(`${API_BASE}/courses`);
                renderCourses(coursesData.courses);
                break;

            case 'mock-tests':
                title.textContent = 'Mock Test Management';
                const mtData = await fetchData(`${API_BASE}/mock-tests`);
                renderMockTests(mtData.packs || []);
                break;

            case 'users':
                title.textContent = 'User Management';
                const usersData = await fetchData(`${API_BASE}/users`);
                renderUsers(usersData.users);
                break;

            case 'certificates':
                title.textContent = 'Certificates Monitoring';
                const certData = await fetchData(`${API_BASE}/certificates`);
                renderCertificates(certData.certs);
                break;

            case 'feedback':
                title.textContent = 'Student Feedback';
                const fbData = await fetchData(`/api/feedback/admin`);
                renderFeedbackAdmin(fbData.feedbacks || []);
                break;

            case 'questions':
                title.textContent = 'Question Bank';
                renderQuestionsUI();
                break;

            case 'daily-challenge':
                title.textContent = 'Daily Challenge';
                const dcData = await fetchData(`/api/test/daily-challenge/all`);
                renderDailyChallenge(dcData.challenges);
                break;

            case 'payments':
                title.textContent = 'Payment Tracking';
                const payData = await fetchData(`${API_BASE}/payments`);
                renderPayments(payData.payments);
                break;

            case 'leaderboard':
                title.textContent = 'Global Leaderboard';
                // Fetch all test results for a global view
                const lbData = await fetchData(`${API_BASE}/daily-challenge/results?limit=100`);
                renderLeaderboard(lbData.results || []);
                break;

            case 'audit-logs':
                title.textContent = 'Audit Trail';
                const auditData = await fetchData(`${API_BASE}/audit-logs`);
                renderAuditLogs(auditData.logs);
                break;

            case 'marketplace':
                title.textContent = 'Marketplace Management';
                const mktData = await fetchData(`${API_BASE}/marketplace/all-books`);
                renderMarketplace(mktData.books || []);
                break;

            case 'slides':
                title.textContent = 'Slideshow Banner Management';
                const slidesData = await fetchData(`${API_BASE}/slides`);
                renderSlides(slidesData.slides || []);
                break;

            case 'community':
                title.textContent = 'Community Moderation';
                const pRes = await fetch('/api/community/posts');
                const dRes = await fetch('/api/community/doubts');
                const pData = await pRes.json();
                const dData = await dRes.json();
                renderCommunityAdmin(pData.posts || [], dData.doubts || []);
                break;

            case 'notifications':
                title.textContent = 'Broadcast Notifications';
                try {
                    const [analyticsRes, historyRes] = await Promise.allSettled([
                        fetchData(`${API_BASE}/notifications/analytics`),
                        fetchData(`${API_BASE}/notifications/history`)
                    ]);
                    const analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value.analytics : {};
                    const history = historyRes.status === 'fulfilled' ? historyRes.value.notifications : [];
                    renderNotificationsAdmin(analytics, history);
                } catch (e) {
                    renderNotificationsAdmin({}, []);
                }
                break;
        }
    } catch (err) {
        contentArea.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Error: ${err.message}</p></div>`;
    }
}

async function renderQuestionsUI() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="grid-column: span 2;">
                <div class="stat-info" style="width:100%;">
                    <h3>Question Bank Management</h3>
                    <p style="margin-bottom:20px; color:var(--text-muted);">Manage all practice and mock test questions from here.</p>
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <input type="text" id="q-search" class="admin-input" placeholder="Search questions..." onkeyup="if(event.key==='Enter') searchQuestions()">
                        <button class="btn btn-primary" onclick="searchQuestions()">Search</button>
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info" style="width:100%;">
                    <h3>Smart Import</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="btn btn-outline" style="width:100%;" onclick="showBulkUploadModal()">Upload JSON</button>
                        <button class="btn btn-primary" style="width:100%;" onclick="showPdfUploadModal()">Import Questions from PDF</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="questions-results" class="admin-card">
            <div style="padding:40px; text-align:center; color:var(--text-muted);">
                <i class="fas fa-spinner fa-spin"></i> Loading recent questions...
            </div>
        </div>
    `;
    
    // Auto-load recent questions
    setTimeout(() => searchQuestions(''), 100);
}

function renderDailyChallenge(challenges) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>Daily Challenge History</h3>
                <a href="admin-daily-challenge.html" class="btn btn-primary">+ Create New Challenge</a>
            </div>
            <table class="admin-table">
                <thead><tr><th>Date</th><th>Exam Type</th><th>Title</th><th>Questions</th><th>Actions</th></tr></thead>
                <tbody>
                    ${challenges.map(c => `
                        <tr>
                            <td>${c.date}</td>
                            <td><span class="admin-badge">${c.examType}</span></td>
                            <td>${c.title}</td>
                            <td>${c.questions.length}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="editChallenge('${c._id}')">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function editChallenge(id) { window.location.href = `admin-daily-challenge.html?id=${id}`; }

// ── RENDER FUNCTIONS FOR USERS, PAYMENTS, ETC ────────────────────────

function renderDashboard(stats) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalUsers}</span>
                    <span class="stat-label">Total Users</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-book"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalCourses}</span>
                    <span class="stat-label">Total Courses</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-tasks"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalTests}</span>
                    <span class="stat-label">Tests Attempted</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fas fa-award"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalCertificates}</span>
                    <span class="stat-label">Certs Issued</span>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="admin-card">
                <div class="card-header">
                    <h3>Quick Insights</h3>
                </div>
                <div style="padding: 24px;">
                    <canvas id="statsChart" style="max-height: 250px;"></canvas>
                </div>
            </div>

            <div class="admin-card">
                <div class="card-header">
                    <h3>Quick Actions</h3>
                </div>
                <div style="padding: 24px;" class="quick-actions">
                    <div class="quick-btn" onclick="showAddCourseModal()">
                        <i class="fas fa-plus-circle"></i>
                        <span>New Course</span>
                    </div>
                    <div class="quick-btn" onclick="showAddMockTestModal()">
                        <i class="fas fa-vial"></i>
                        <span>New Mock Test</span>
                    </div>
                    <div class="quick-btn" onclick="loadView('users')">
                        <i class="fas fa-user-shield"></i>
                        <span>Manage Users</span>
                    </div>
                    <div class="quick-btn" onclick="loadView('audit-logs')">
                        <i class="fas fa-history"></i>
                        <span>System Logs</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-grid" style="margin-top: 24px;">
            <div class="admin-card">
                <div class="card-header">
                    <h3>Revenue Analytics (Last 7 Days)</h3>
                </div>
                <div style="padding: 24px;">
                    <canvas id="revenueChart" style="max-height: 250px;"></canvas>
                </div>
            </div>

            <div class="admin-card">
                <div class="card-header">
                    <h3>Daily Active Users</h3>
                </div>
                <div style="padding: 24px;">
                    <canvas id="activeUsersChart" style="max-height: 250px;"></canvas>
                </div>
            </div>
        </div>
    `;

    // 1. Overview statsChart
    const ctx = document.getElementById('statsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Users', 'Courses', 'Tests', 'Certs'],
            datasets: [{
                data: [stats.totalUsers, stats.totalCourses, stats.totalTests, stats.totalCertificates],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#a855f7'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // 2. Revenue Chart
    const revCtx = document.getElementById('revenueChart').getContext('2d');
    new Chart(revCtx, {
        type: 'line',
        data: {
            labels: stats.revenueData ? stats.revenueData.labels : [],
            datasets: [{
                label: 'Revenue (INR)',
                data: stats.revenueData ? stats.revenueData.values : [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // 3. Active Users Chart
    const actCtx = document.getElementById('activeUsersChart').getContext('2d');
    new Chart(actCtx, {
        type: 'line',
        data: {
            labels: stats.activeUserData ? stats.activeUserData.labels : [],
            datasets: [{
                label: 'Active Users',
                data: stats.activeUserData ? stats.activeUserData.values : [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderCourses(courses) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>All Courses</h3>
                <button class="btn btn-primary" onclick="showAddCourseModal()">+ Add New Course</button>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Level</th>
                        <th>Duration</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(c => `
                        <tr>
                            <td><strong>${c.title}</strong></td>
                            <td>${c.category || 'N/A'}</td>
                            <td>${c.level}</td>
                            <td>${c.duration ? `<span class="admin-badge" style="background:#eff6ff;color:#1d4ed8;"><i class="fas fa-clock" style="margin-right:4px;"></i>${c.duration}</span>` : '<span style="color:var(--text-muted);font-size:0.82rem;">—</span>'}</td>
                            <td>${c.price === 0 ? '<span class="admin-badge">Free</span>' : '₹' + c.price}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="editCourse('${c._id}')">Edit</button>
                                <button class="btn btn-sm btn-outline danger" onclick="deleteCourse('${c._id}')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderMockTests(packs = []) {
    const content = document.getElementById('content-area');
    
    if (packs.length === 0) {
        content.innerHTML = `
            <div class="admin-card">
                <div class="card-header">
                    <h3>Mock Test Packs</h3>
                    <button class="btn btn-primary" onclick="showAddMockTestModal()">+ Add New Pack</button>
                </div>
                <div style="padding: 60px; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-vial" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p>No mock test packs found. Create your first one!</p>
                </div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>Mock Test Packs</h3>
                <button class="btn btn-primary" onclick="showAddMockTestModal()">+ Add New Pack</button>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Tests Count</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${packs.map(p => `
                        <tr>
                            <td><strong>${p.title}</strong></td>
                            <td>${p.category}</td>
                            <td>${p.tests.length} Tests</td>
                            <td>${p.price === 0 ? '<span class="admin-badge">Free</span>' : '₹' + p.price}</td>
                            <td><span class="admin-badge" style="background:${p.isActive ? '#ecfdf5' : '#fee2e2'}; color:${p.isActive ? '#10b981' : '#ef4444'}">${p.isActive ? 'Active' : 'Draft'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="editMockTest('${p._id}')">Edit</button>
                                <button class="btn btn-sm btn-outline" onclick="deleteMockTest('${p._id}')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ── COURSE MODAL & LOGIC ─────────────────────────────────────────────

function showAddCourseModal() {
    renderCourseModal('Add New Course');
}

function renderCourseModal(title, course = null) {
    const modalContainer = document.getElementById('modal-container');
    const lessons = course ? course.lessons : [];
    const quiz = course ? course.quizQuestions : [];

    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 900px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="card-header">
                <h3>${title}</h3>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            
            <div class="modal-tabs" style="padding: 0 24px;">
                <button class="modal-tab-btn active" onclick="switchModalTab('basic', this)">Basic Info</button>
                <button class="modal-tab-btn" onclick="switchModalTab('lessons', this)">Curriculum (${lessons.length})</button>
                <button class="modal-tab-btn" onclick="switchModalTab('quiz', this)">Exam Quiz (${quiz.length})</button>
            </div>

            <form id="courseForm" style="flex: 1; overflow-y: auto; padding: 0 24px 24px;">
                <div id="tab-basic" class="tab-pane active">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group"><label>Title</label><input type="text" id="courseTitle" class="admin-input" value="${course?.title || ''}" required></div>
                        <div class="form-group"><label>Slug</label><input type="text" id="courseSlug" class="admin-input" value="${course?.slug || ''}" required></div>
                        <div class="form-group"><label>Price (₹)</label><input type="number" id="coursePrice" class="admin-input" value="${course?.price || 0}"></div>
                        <div class="form-group">
                            <label>Level</label>
                            <select id="courseLevel" class="admin-input">
                                <option value="Beginner" ${course?.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                                <option value="Intermediate" ${course?.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                                <option value="Advanced" ${course?.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Category</label><input type="text" id="courseCategory" class="admin-input" value="${course?.category || ''}"></div>
                        <div class="form-group"><label>Icon (Emoji)</label><input type="text" id="courseIcon" class="admin-input" value="${course?.icon || '📚'}"></div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label style="display:flex;align-items:center;gap:6px;"><i class="fas fa-clock" style="color:#6366f1;"></i> Course Duration <span style="color:var(--text-muted);font-size:0.78rem;font-weight:400;"\u003e(e.g. 6 Hours, 4 Weeks, 2 Months)</span></label>
                            <input type="text" id="courseDuration" class="admin-input" value="${course?.duration || ''}" placeholder="e.g. 6 Hours, 4 Weeks, 2 Months">
                            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">This value will be displayed on course cards, my-courses page, and printed on the student's certificate.</p>
                        </div>
                    </div>
                    <div class="form-group"><label>Description</label><textarea id="courseDescription" class="admin-input" style="height:100px;">${course?.description || ''}</textarea></div>
                </div>

                <div id="tab-lessons" class="tab-pane">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4>Course Lessons</h4>
                        <button type="button" class="btn btn-sm btn-primary" onclick="addLessonRow()">+ Add Lesson</button>
                    </div>
                    <div id="lessons-list" class="item-list">
                        ${lessons.map((l, i) => renderLessonRow(l, i)).join('')}
                    </div>
                </div>

                <div id="tab-quiz" class="tab-pane">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                        <h4 style="margin:0;">Final Exam Quiz</h4>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <label for="pdfQuizUpload" class="btn btn-sm" style="background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-weight:700;font-size:0.82rem;" title="Upload a PDF with MCQ questions to auto-fill the quiz">
                                <i class="fas fa-file-pdf"></i> Upload Questions PDF
                            </label>
                            <input type="file" id="pdfQuizUpload" accept=".pdf" style="display:none" onchange="previewPDFQuestions(event, '${course?._id || ''}')">
                            <button type="button" class="btn btn-sm btn-primary" onclick="addQuizRow()">+ Add Question</button>
                        </div>
                    </div>

                    <!-- PDF Preview Panel (hidden by default) -->
                    <div id="pdfPreviewPanel" style="display:none; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div>
                                <strong id="pdfPreviewTitle" style="color:#1e293b;">📄 PDF Preview</strong>
                                <span id="pdfPreviewCount" style="background:#ede9fe;color:#6366f1;font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:20px;margin-left:8px;"></span>
                            </div>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <label style="font-size:0.82rem;color:#475569;font-weight:600;display:flex;align-items:center;gap:5px;">
                                    <input type="checkbox" id="pdfReplaceMode" checked style="accent-color:#6366f1;"> Replace existing questions
                                </label>
                                <button type="button" id="pdfSaveBtn" onclick="savePDFQuestions()" class="btn btn-sm" style="background:#10b981;color:#fff;font-weight:700;">✅ Save to Course</button>
                                <button type="button" onclick="document.getElementById('pdfPreviewPanel').style.display='none'; window._pdfParsedQ=[];" class="btn btn-sm btn-outline">Cancel</button>
                            </div>
                        </div>
                        <div id="pdfQPreviewList" style="max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;"></div>
                    </div>

                    <div id="quiz-list" class="item-list">
                        ${quiz.map((q, i) => renderQuizRow(q, i)).join('')}
                    </div>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: flex-end; position: sticky; bottom: 0; background: white; padding: 15px 0; border-top: 1px solid var(--border);">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${course ? 'Save Changes' : 'Create Course'}</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.classList.add('active');
    document.getElementById('courseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleCourseSubmit(course?._id);
    });
}

function renderLessonRow(l = {}, i) {
    return `
        <div class="item-row lesson-row">
            <div class="drag-handle"><i class="fas fa-grip-lines"></i></div>
            <div class="item-info">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:8px;">
                    <input type="text" placeholder="Title" class="admin-input l-title" value="${l.title || ''}" style="padding:8px;">
                    <input type="text" placeholder="ID (l1)" class="admin-input l-id" value="${l.lessonId || ''}" style="padding:8px;">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" placeholder="Video URL" class="admin-input l-video" value="${l.videoUrl || ''}" style="padding:8px;">
                    <input type="text" placeholder="PDF URL" class="admin-input l-pdf" value="${l.pdfUrl || ''}" style="padding:8px;">
                </div>
            </div>
            <button type="button" class="btn-icon danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

function renderQuizRow(q = {}, i) {
    const correctIdx = q.correctIndex !== undefined ? q.correctIndex : 0;
    return `
        <div class="item-row quiz-row">
            <div class="item-info">
                <input type="text" placeholder="Question Text" class="admin-input q-text" value="${q.question || ''}" style="margin-bottom:8px; padding:8px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                    ${[0, 1, 2, 3].map(j => `
                        <div style="display:flex; align-items:center; gap:5px;">
                            <input type="radio" name="q-correct-${Math.random().toString(36).substr(2, 5)}" class="q-correct-radio" ${j === correctIdx ? 'checked' : ''} value="${j}">
                            <input type="text" placeholder="Option ${j + 1}" class="admin-input q-opt" value="${q.options ? q.options[j] : ''}" style="padding:6px; flex:1;">
                        </div>
                    `).join('')}
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Select the radio button next to the correct option.</p>
            </div>
            <button type="button" class="btn-icon danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

    // ── PDF QUESTION UPLOAD ──────────────────────────────────────────
    window._pdfParsedQ = [];     // temp store for parsed questions
    window._pdfCourseId = null;  // current course _id being edited

function pollJob(jobId, onProgress, onSuccess, onError) {
    const token = localStorage.getItem('token');
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/pdf-jobs/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const msg = await getFetchErrorMessage(res);
                throw new Error(msg);
            }
            const data = await res.json();
            if (!data.ok) {
                throw new Error(data.message || 'Failed to poll job');
            }
            if (data.status === 'completed') {
                clearInterval(interval);
                onSuccess(data.result);
            } else if (data.status === 'failed') {
                clearInterval(interval);
                onError(new Error(data.error || 'Job failed'));
            } else {
                onProgress(data.progress, data.stage, data.logs);
            }
        } catch (err) {
            clearInterval(interval);
            onError(err);
        }
    }, 1000);
}

window.previewPDFQuestions = async function(event, courseId) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; // reset so same file can be re-uploaded

    window._pdfCourseId = courseId;
    const panel = document.getElementById('pdfPreviewPanel');
    const previewList = document.getElementById('pdfQPreviewList');
    const countEl = document.getElementById('pdfPreviewCount');
    const saveBtn = document.getElementById('pdfSaveBtn');

    panel.style.display = 'block';
    previewList.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Uploading PDF...</div>';
    countEl.textContent = 'Uploading...';
    saveBtn.disabled = true;

    const quizList = document.getElementById('quiz-list');
    const existingCount = quizList ? quizList.querySelectorAll('.quiz-row').length : 0;

    const fd = new FormData();
    fd.append('pdf', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute upload limit

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/generate-questions-from-pdf?expectedCount=${existingCount}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorMsg = await getFetchErrorMessage(res);
            previewList.innerHTML = `<div style="color:#ef4444;font-size:0.88rem;white-space:pre-wrap;background:#fef2f2;padding:14px;border-radius:8px;">❌ Import Failed: ${errorMsg}</div>`;
            countEl.textContent = 'Import Failed';
            saveBtn.disabled = true;
            return;
        }

        const data = await res.json();
        if (!data.ok || !data.jobId) {
            throw new Error(data.message || 'No Job ID returned.');
        }

        previewList.innerHTML = '<div class="pdf-progress-container" style="text-align:center;padding:20px;color:#64748b;">' +
            '<i class="fas fa-spinner fa-spin"></i> Starting background parser...<br>' +
            '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:10px;" class="pdf-job-stage">Queueing...</div>' +
            '<div style="font-weight:bold;margin-top:5px;font-size:1.1rem;" class="pdf-job-pct">0%</div>' +
            '</div>';
        countEl.textContent = 'Parsing...';

        pollJob(data.jobId,
            (progress, stage, logs) => {
                const stageEl = previewList.querySelector('.pdf-job-stage');
                const pctEl = previewList.querySelector('.pdf-job-pct');
                if (stageEl) stageEl.textContent = stage;
                if (pctEl) pctEl.textContent = `${progress}%`;
                countEl.textContent = `Parsing: ${progress}%`;
            },
            (result) => {
                const questions = result.questions || [];
                if (questions.length === 0) {
                    previewList.innerHTML = `<div style="color:#ef4444;font-size:0.88rem;white-space:pre-wrap;background:#fef2f2;padding:14px;border-radius:8px;">❌ Import Failed: No questions found.</div>`;
                    countEl.textContent = 'Import Failed';
                    saveBtn.disabled = true;
                    return;
                }

                window._pdfParsedQ = questions;
                countEl.textContent = `Import Successful: ${questions.length} questions found`;
                saveBtn.disabled = false;

                previewList.innerHTML = `<div style="color:#10b981;font-weight:700;margin-bottom:12px;">✅ Import Successful!</div>` + questions.map((q, i) => `
                    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;">
                        <div style="font-weight:700;font-size:0.88rem;color:#1e293b;margin-bottom:8px;">Q${i+1}. ${q.question}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                            ${q.options.map((opt, j) => `
                                <div style="font-size:0.8rem;padding:4px 8px;border-radius:5px;background:${j === q.correctIndex ? '#dcfce7' : '#f8fafc'};color:${j === q.correctIndex ? '#166534' : '#475569'};">
                                    ${['A','B','C','D'][j]}) ${opt} ${j === q.correctIndex ? '✓' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            },
            (err) => {
                previewList.innerHTML = `<div style="color:#ef4444;font-size:0.88rem;white-space:pre-wrap;background:#fef2f2;padding:14px;border-radius:8px;">❌ Import Failed: ${err.message}</div>`;
                countEl.textContent = 'Import Failed';
                saveBtn.disabled = true;
            }
        );
    } catch (err) {
        clearTimeout(timeoutId);
        const errMsg = err.name === 'AbortError' ? 'Request timed out.' : err.message;
        previewList.innerHTML = `<div style="color:#ef4444;font-size:0.88rem;white-space:pre-wrap;background:#fef2f2;padding:14px;border-radius:8px;">❌ Import Failed: ${errMsg}</div>`;
        countEl.textContent = 'Import Failed';
        saveBtn.disabled = true;
    }
};

window.savePDFQuestions = async function() {
    const questions = window._pdfParsedQ;
    const courseId = window._pdfCourseId;
    if (!questions || questions.length === 0) { alert('No questions to save'); return; }

    const quizList = document.getElementById('quiz-list');
    const replaceMode = document.getElementById('pdfReplaceMode').checked;

    if (!courseId) {
        if (replaceMode) quizList.innerHTML = '';
        questions.forEach(q => quizList.insertAdjacentHTML('beforeend', renderQuizRow(q, quizList.querySelectorAll('.quiz-row').length)));
        document.getElementById('pdfPreviewPanel').style.display = 'none';
        window._pdfParsedQ = [];
        alert(`✅ ${questions.length} questions added to the form. Click "Save Changes" to persist.`);
        return;
    }

    const saveBtn = document.getElementById('pdfSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const coursesController = new AbortController();
    const saveController = new AbortController();
    let coursesTimeout = null;
    let saveTimeout = null;

    try {
        const token = localStorage.getItem('token');

        let finalQuestions = questions;
        if (!replaceMode) {
            coursesTimeout = setTimeout(() => coursesController.abort(), 300000); // 5 min timeout
            const currentRes = await fetch(`${API_BASE}/courses`, { 
                headers: { 'Authorization': `Bearer ${token}` },
                signal: coursesController.signal
            });
            clearTimeout(coursesTimeout);
            if (!currentRes.ok) {
                const errorMsg = await getFetchErrorMessage(currentRes);
                throw new Error(errorMsg);
            }
            const currentData = await currentRes.json();
            const currentCourse = (currentData.courses || []).find(c => c._id === courseId);
            const existing = (currentCourse?.quizQuestions || []);
            finalQuestions = [...existing, ...questions];
        }

        saveTimeout = setTimeout(() => saveController.abort(), 300000); // 5 min timeout
        const res = await fetch(`${API_BASE}/courses/${courseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ quizQuestions: finalQuestions }),
            signal: saveController.signal
        });
        clearTimeout(saveTimeout);
        if (!res.ok) {
            const errorMsg = await getFetchErrorMessage(res);
            throw new Error(errorMsg);
        }
        const data = await res.json();

        if (!data.ok) throw new Error(data.message || 'Save failed');

        if (replaceMode) quizList.innerHTML = '';
        questions.forEach(q => quizList.insertAdjacentHTML('beforeend', renderQuizRow(q, quizList.querySelectorAll('.quiz-row').length)));

        document.getElementById('pdfPreviewPanel').style.display = 'none';
        window._pdfParsedQ = [];
        saveBtn.textContent = '✅ Save to Course';
        saveBtn.disabled = false;
        alert(`✅ ${questions.length} questions saved to course successfully!`);
    } catch (err) {
        if (coursesTimeout) clearTimeout(coursesTimeout);
        if (saveTimeout) clearTimeout(saveTimeout);
        saveBtn.textContent = '✅ Save to Course';
        saveBtn.disabled = false;
        const errMsg = err.name === 'AbortError' ? 'Request timed out.' : err.message;
        alert('Error saving questions: ' + errMsg);
    }
};


    async function handleCourseSubmit(id) {
    const payload = {
        title: document.getElementById('courseTitle').value,
        slug: document.getElementById('courseSlug').value,
        price: Number(document.getElementById('coursePrice').value),
        level: document.getElementById('courseLevel').value,
        category: document.getElementById('courseCategory').value,
        icon: document.getElementById('courseIcon').value,
        description: document.getElementById('courseDescription').value,
        duration: (document.getElementById('courseDuration').value || '').trim(),
        isFree: Number(document.getElementById('coursePrice').value) === 0,
        isPremium: Number(document.getElementById('coursePrice').value) > 0,
        lessons: Array.from(document.querySelectorAll('.lesson-row')).map(row => ({
            title: row.querySelector('.l-title').value,
            lessonId: row.querySelector('.l-id').value,
            videoUrl: row.querySelector('.l-video').value,
            pdfUrl: row.querySelector('.l-pdf').value
        })),
        quizQuestions: Array.from(document.querySelectorAll('.quiz-row')).map(row => {
            const options = Array.from(row.querySelectorAll('.q-opt')).map(opt => opt.value);
            const radios = Array.from(row.querySelectorAll('.q-correct-radio'));
            const correctIndex = radios.findIndex(r => r.checked);
            
            return {
                question: row.querySelector('.q-text').value,
                options: options,
                correctIndex: correctIndex >= 0 ? correctIndex : 0
            };
        })
    };

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(id ? `${API_BASE}/courses/${id}` : `${API_BASE}/courses`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.ok) { 
            closeModal(); 
            loadView('courses'); 
        } else {
            alert(`Error: ${data.message || 'Saving failed'}`);
        }
    } catch (err) {
        alert('Network error while saving course');
    }
}

// ── MOCK TEST MODAL & LOGIC ──────────────────────────────────────────

async function showAddMockTestModal() { renderMockTestModal('Add New Mock Test Pack'); }
async function editMockTest(id) {
    try {
        const data = await fetchData(`${API_BASE}/mock-tests/${id}`);
        if (data.ok && data.pack) {
            renderMockTestModal('Edit Mock Test Pack', data.pack);
        } else {
            alert(data.message || 'Mock test pack not found');
        }
    } catch (err) {
        alert('Failed to load pack details: ' + err.message);
    }
}

function renderMockTestModal(title, pack = null) {
    const modalContainer = document.getElementById('modal-container');
    const tests = pack ? pack.tests : [];

    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 900px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="card-header">
                <h3>${title}</h3>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            
            <div class="modal-tabs" style="padding: 0 24px;">
                <button class="modal-tab-btn active" onclick="switchModalTab('mt-basic', this)">Basic Info</button>
                <button class="modal-tab-btn" onclick="switchModalTab('mt-tests', this)">Tests (${tests.length})</button>
            </div>

            <form id="mtForm" style="flex: 1; overflow-y: auto; padding: 0 24px 24px;">
                <div id="tab-mt-basic" class="tab-pane active">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group"><label>Pack Title</label><input type="text" id="mtTitle" class="admin-input" value="${pack?.title || ''}" required></div>
                        <div class="form-group"><label>Pack ID (Unique)</label><input type="text" id="mtId" class="admin-input" value="${pack?.id || ''}" required></div>
                        <div class="form-group"><label>Category</label><input type="text" id="mtCategory" class="admin-input" value="${pack?.category || ''}" placeholder="JEE, NEET, SSC..."></div>
                        <div class="form-group"><label>Price (₹)</label><input type="number" id="mtPrice" class="admin-input" value="${pack?.price || 0}"></div>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="mtActive" class="admin-input">
                            <option value="true" ${pack?.isActive !== false ? 'selected' : ''}>Active</option>
                            <option value="false" ${pack?.isActive === false ? 'selected' : ''}>Draft / Hidden</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Description</label><textarea id="mtDescription" class="admin-input" style="height:80px;">${pack?.description || ''}</textarea></div>
                </div>

                <div id="tab-mt-tests" class="tab-pane">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4>Tests in this Pack</h4>
                        <button type="button" class="btn btn-sm btn-primary" onclick="addMockTestRow()">+ Add Test</button>
                    </div>
                    <div id="mt-list" class="item-list">
                        ${tests.map((t, i) => renderMockTestRow(t, i)).join('')}
                    </div>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: flex-end; position: sticky; bottom: 0; background: white; padding: 15px 0; border-top: 1px solid var(--border);">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${pack ? 'Save Pack' : 'Create Pack'}</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.classList.add('active');
    document.getElementById('mtForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleMockTestSubmit(pack?._id);
    });
}

function renderMockTestRow(t = {}, i) {
    const qCount = t.questions ? t.questions.length : 0;
    const hasHindi = t.questions && t.questions.length > 0 && t.questions[0] && t.questions[0].question_hi;
    const qIds = t.questions ? (Array.isArray(t.questions) && typeof t.questions[0] === 'object' ? t.questions.map(q => q._id).join(', ') : t.questions.join(', ')) : '';

    return `
        <div class="item-row mt-row" data-index="${i}">
            <div class="item-info">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px; margin-bottom:8px;">
                    <input type="text" placeholder="Test Title" class="admin-input mt-t-title" value="${t.testTitle || ''}" style="padding:8px;">
                    <input type="number" placeholder="Duration (min)" class="admin-input mt-t-dur" value="${t.durationMinutes || 60}" style="padding:8px;">
                    <input type="text" placeholder="ID (slug)" class="admin-input mt-t-id" value="${t.testId || ''}" style="padding:8px;">
                </div>
                <div style="background: var(--bg-light); padding:12px; border-radius:8px; border: 1px dashed var(--border);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                        <span style="font-size:0.8rem; font-weight:600;">
                            <i class="fas fa-list-ol"></i> <span class="q-count-badge">${qCount}</span> Questions Linked
                            ${hasHindi ? '<span style="margin-left:8px; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:20px; font-size:0.7rem;">🇮🇳 Hindi Added</span>' : ''}
                        </span>
                        <input type="hidden" class="mt-t-qids" value="${qIds}">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <!-- English PDF -->
                        <div>
                            <div style="font-size:0.7rem; font-weight:700; color:#6366f1; margin-bottom:4px;">🇬🇧 ENGLISH MEDIUM</div>
                            <input type="file" class="mt-t-pdf-en-input" accept=".pdf" style="display:none;" onchange="handlePdfToTest(this, ${i}, 'en')">
                            <button type="button" class="btn btn-sm btn-outline mt-t-en-btn" onclick="this.previousElementSibling.click()" style="width:100%; border-color:#6366f1; color:#6366f1;">
                                <i class="fas fa-file-pdf"></i> ${qCount > 0 ? 'Replace English PDF' : 'Upload English PDF'}
                            </button>
                            <div class="pdf-status-en" style="font-size:0.68rem; margin-top:4px; min-height:16px;"></div>
                        </div>
                        <!-- Hindi PDF -->
                        <div>
                            <div style="font-size:0.7rem; font-weight:700; color:#f59e0b; margin-bottom:4px;">🇮🇳 HINDI MEDIUM</div>
                            <input type="file" class="mt-t-pdf-hi-input" accept=".pdf" style="display:none;" onchange="handlePdfToTest(this, ${i}, 'hi')">
                            <button type="button" class="btn btn-sm btn-outline mt-t-hi-btn" onclick="this.previousElementSibling.click()" style="width:100%; border-color:#f59e0b; color:#d97706;">
                                <i class="fas fa-file-pdf"></i> ${hasHindi ? 'Replace Hindi PDF' : 'Upload Hindi PDF'}
                            </button>
                            <div class="pdf-status-hi" style="font-size:0.68rem; margin-top:4px; min-height:16px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="btn-icon danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

async function handlePdfToTest(input, index, lang = 'en') {
    const file = input.files[0];
    if (!file) return;

    const row = input.closest('.mt-row');
    const statusEn = row.querySelector('.pdf-status-en');
    const statusHi = row.querySelector('.pdf-status-hi');
    const btnEn = row.querySelector('.mt-t-en-btn');
    const btnHi = row.querySelector('.mt-t-hi-btn');
    const countBadge = row.querySelector('.q-count-badge');
    const qIdsInput  = row.querySelector('.mt-t-qids');

    const formData = new FormData();
    formData.append('pdf', file);

    const activeStatus = lang === 'hi' ? statusHi : statusEn;
    const activeBtn = lang === 'hi' ? btnHi : btnEn;

    activeStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading PDF...';
    btnEn.disabled = true;
    btnHi.disabled = true;

    const existingQIds = qIdsInput.value.split(',').map(s => s.trim()).filter(Boolean);
    const expectedCount = existingQIds.length;

    const parseController = new AbortController();
    let parseTimeout = setTimeout(() => parseController.abort(), 600000); // 10 min upload limit

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/generate-questions-from-pdf?expectedCount=${expectedCount}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: parseController.signal
        });
        clearTimeout(parseTimeout);

        if (!res.ok) {
            const errorMsg = await getFetchErrorMessage(res);
            activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: ${errorMsg}</span>`;
            btnEn.disabled = false;
            btnHi.disabled = false;
            return;
        }

        const initialData = await res.json();
        if (!initialData.ok || !initialData.jobId) {
            throw new Error(initialData.message || 'No job ID received.');
        }

        activeStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parsing... <span class="pdf-job-pct">0%</span>';

        pollJob(initialData.jobId,
            (progress, stage, logs) => {
                const pctEl = activeStatus.querySelector('.pdf-job-pct');
                if (pctEl) {
                    pctEl.textContent = `${progress}% (${stage})`;
                } else {
                    activeStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Parsing... <span class="pdf-job-pct">${progress}% (${stage})</span>`;
                }
            },
            async (result) => {
                try {
                    const data = result;
                    if (!data.questions || data.questions.length === 0) {
                        activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: No questions found.</span>`;
                        btnEn.disabled = false;
                        btnHi.disabled = false;
                        return;
                    }

                    activeStatus.innerHTML = `<span style="color:var(--success)">✅ Processing completed! Loading preview...</span>`;
                    btnEn.disabled = false;
                    btnHi.disabled = false;

                    showQuestionsPreviewModal(data.questions, data.stats || {}, async (editedQuestions, replaceDuplicates) => {
                        // ── MERGE TRANSLATIONS IF QUESTIONS ALREADY EXIST ──
                        if (existingQIds.length > 0 && existingQIds.length === editedQuestions.length) {
                            activeStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merging translations...';

                            const payload = editedQuestions.map((q, i) => {
                                const opts = q.options || [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE].filter(Boolean);
                                if (lang === 'hi') {
                                    return {
                                        _id: existingQIds[i],
                                        question_hi: q.question_hi || q.question,
                                        options_hi: opts
                                    };
                                } else {
                                    return {
                                        _id: existingQIds[i],
                                        question_en: q.question_en || q.question,
                                        options_en: opts
                                    };
                                }
                            });

                            const targetEndpoint = lang === 'hi' ? 'add-hindi' : 'add-english';
                            const mergeController = new AbortController();
                            let mergeTimeout = setTimeout(() => mergeController.abort(), 300000); // 5 min timeout

                            const updateRes = await fetch(`${API_BASE}/questions/${targetEndpoint}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                                signal: mergeController.signal
                            });
                            clearTimeout(mergeTimeout);

                            if (!updateRes.ok) {
                                const errorMsg = await getFetchErrorMessage(updateRes);
                                activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: Merge failed: ${errorMsg}</span>`;
                                return;
                            }
                            const updateData = await updateRes.json();
                            
                            if (updateData.ok) {
                                if (lang === 'hi') {
                                    statusHi.innerHTML = `<span style="color:#d97706; font-weight:600;">✅ Import Successful: ${editedQuestions.length} Hindi translations merged!</span>`;
                                    btnHi.innerHTML = '<i class="fas fa-check"></i> Hindi Updated';
                                } else {
                                    statusEn.innerHTML = `<span style="color:#6366f1; font-weight:600;">✅ Import Successful: ${editedQuestions.length} English translations merged!</span>`;
                                    btnEn.innerHTML = '<i class="fas fa-check"></i> English Updated';
                                }
                            } else {
                                activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: Merge failed: ${updateData.message || 'DB error'}</span>`;
                            }
                            return;
                        }

                        // ── SAVE NEW QUESTIONS PATH ──
                        activeStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving questions...';

                        const packCategory = (document.getElementById('mtCategory')?.value || '').trim() || 'Mock Test';
                        const testTitleText = (row.querySelector('.mt-t-title')?.value || '').trim() || 'General';

                        let subjectName = testTitleText;
                        if (testTitleText.includes('-')) {
                            subjectName = testTitleText.split('-').pop().trim();
                        } else if (testTitleText.includes(':')) {
                            subjectName = testTitleText.split(':').pop().trim();
                        }

                        const mappedQuestions = editedQuestions.map(q => {
                            const opts = q.options || [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE].filter(Boolean);
                            const correctIdx = q.correctIndex !== undefined ? q.correctIndex : 0;
                            const correctAnswerText = opts[correctIdx] || '';
                            return {
                                question: q.question,
                                question_en: lang === 'en' ? q.question : q.question_en || '',
                                question_hi: lang === 'hi' ? q.question : q.question_hi || '',
                                options: opts,
                                options_en: lang === 'en' ? opts : q.options_en || opts,
                                options_hi: lang === 'hi' ? opts : q.options_hi || opts,
                                correctAnswer: correctAnswerText,
                                category: q.category || packCategory,
                                subject: q.subject || subjectName,
                                difficulty: q.difficulty || 'Medium',
                                image: q.image || '',
                                isMockTestOnly: true
                            };
                        });

                        const saveController = new AbortController();
                        let saveTimeout = setTimeout(() => saveController.abort(), 300000); // 5 min timeout

                        const saveRes = await fetch(`${API_BASE}/questions?replaceDuplicates=${replaceDuplicates}`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(mappedQuestions),
                            signal: saveController.signal
                        });
                        clearTimeout(saveTimeout);

                        if (!saveRes.ok) {
                            const errorMsg = await getFetchErrorMessage(saveRes);
                            activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: Save failed: ${errorMsg}</span>`;
                            return;
                        }
                        const saveData = await saveRes.json();
                        
                        if (saveData.ok) {
                            const newQIds = saveData.questions.map(q => q._id).join(', ');
                            qIdsInput.value = newQIds; 
                            countBadge.textContent = saveData.questions.length;
                            
                            if (lang === 'en') {
                                statusEn.innerHTML = `<span style="color:#6366f1; font-weight:600;">✅ Import Successful: ${saveData.questions.length} English Qs imported!</span>`;
                                statusHi.innerHTML = `<span style="color:#94a3b8;">Pending Hindi upload...</span>`;
                                btnEn.innerHTML = '<i class="fas fa-check"></i> English Uploaded';
                                btnHi.innerHTML = '<i class="fas fa-file-pdf"></i> Upload Hindi PDF';
                            } else {
                                statusHi.innerHTML = `<span style="color:#d97706; font-weight:600;">✅ Import Successful: ${saveData.questions.length} Hindi Qs imported!</span>`;
                                statusEn.innerHTML = `<span style="color:#94a3b8;">Pending English upload...</span>`;
                                btnHi.innerHTML = '<i class="fas fa-check"></i> Hindi Uploaded';
                                btnEn.innerHTML = '<i class="fas fa-file-pdf"></i> Upload English PDF';
                            }
                        } else {
                            activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: Save failed: ${saveData.message || 'DB error'}</span>`;
                        }
                    });
                } catch (innerErr) {
                    activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Save/Merge Error: ${innerErr.message}</span>`;
                    btnEn.disabled = false;
                    btnHi.disabled = false;
                }
            },
            (err) => {
                activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: ${err.message}</span>`;
                btnEn.disabled = false;
                btnHi.disabled = false;
            }
        );
    } catch (e) {
        clearTimeout(parseTimeout);
        const errMsg = e.name === 'AbortError' ? 'Request timed out.' : e.message;
        activeStatus.innerHTML = `<span style="color:var(--danger)">❌ Import Failed: ${errMsg}</span>`;
        btnEn.disabled = false;
        btnHi.disabled = false;
    }
}

async function handleMockTestSubmit(id) {
    const payload = {
        title: document.getElementById('mtTitle').value,
        id: document.getElementById('mtId').value,
        category: document.getElementById('mtCategory').value,
        price: Number(document.getElementById('mtPrice').value),
        isFree: Number(document.getElementById('mtPrice').value) === 0,
        isActive: document.getElementById('mtActive').value === 'true',
        description: document.getElementById('mtDescription').value,
        tests: Array.from(document.querySelectorAll('.mt-row')).map(row => ({
            testTitle: row.querySelector('.mt-t-title').value,
            testId: row.querySelector('.mt-t-id').value,
            durationMinutes: Number(row.querySelector('.mt-t-dur').value),
            questions: row.querySelector('.mt-t-qids').value.split(',').map(s => s.trim()).filter(s => s)
        }))
    };

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(id ? `${API_BASE}/mock-tests/${id}` : `${API_BASE}/mock-tests`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (data.ok) { 
            closeModal(); 
            loadView('mock-tests'); 
        } else {
            alert(`Error: ${data.message || 'Saving failed'}`);
        }
    } catch (err) {
        alert('Network error while saving mock test pack');
    }
}

// ── UTILITIES ─────────────────────────────────────────────────────────

function switchModalTab(tabId, btn) {
    const modal = btn.closest('.modal-content');
    modal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    modal.querySelector(`#tab-${tabId}`).classList.add('active');
}

function closeModal() { document.getElementById('modal-container').classList.remove('active'); }

function addLessonRow() { const div = document.createElement('div'); div.innerHTML = renderLessonRow({}, 0); document.getElementById('lessons-list').appendChild(div.firstElementChild); }
function addQuizRow() { const div = document.createElement('div'); div.innerHTML = renderQuizRow({}, 0); document.getElementById('quiz-list').appendChild(div.firstElementChild); }
function addMockTestRow() { const div = document.createElement('div'); div.innerHTML = renderMockTestRow({}, 0); document.getElementById('mt-list').appendChild(div.firstElementChild); }

// (Old functions like renderUsers, renderPayments, etc. remain similar but upgraded for style)

function renderUsers(users) {
    const content = document.getElementById('content-area');
    
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>User Directory</h3>
                <div style="background:#f1f5f9; padding:5px 12px; border-radius:20px; font-size:0.85rem; font-weight:600; color:#475569;">
                    Total Members: ${users.length}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>User Profile</th>
                        <th>Phone</th>
                        <th>Joined On</th>
                        <th>Account Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => {
                        const roleColor = u.role === 'admin' ? '#ef4444' : (u.role === 'STUDENT' ? '#3b82f6' : '#64748b');
                        const roleBg = u.role === 'admin' ? '#fef2f2' : (u.role === 'STUDENT' ? '#eff6ff' : '#f8fafc');
                        
                        return `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:36px; height:36px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#475569; font-weight:700;">
                                        ${(u.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style="font-weight:600; color:#0f172a;">${u.name || 'No Name'}</div>
                                        <div style="font-size:0.75rem; color:#64748b;">${u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-size:0.9rem; color:#475569;">${u.phone || '---'}</div>
                            </td>
                            <td>
                                <div style="font-size:0.9rem; color:#475569;">${formatDate(u.createdAt)}</div>
                            </td>
                            <td>
                                <span class="admin-badge" style="background:${roleBg}; color:${roleColor}; border:1px solid ${roleColor}44; border-radius:12px; padding:2px 10px; font-size:0.7rem;">
                                    ${(u.role || 'USER').toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn btn-sm btn-outline" style="color:#ef4444; border-color:#fecaca;" onclick="toggleUserBlock('${u._id}', '${u.role}')">
                                        <i class="fas fa-ban"></i> ${u.isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            ${users.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No users registered yet.</div>' : ''}
        </div>
    `;
}

function renderPayments(payments) {
    const content = document.getElementById('content-area');
    
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
               ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Transaction History</h3>
                <div style="background:#f1f5f9; padding:5px 12px; border-radius:20px; font-size:0.85rem; font-weight:600; color:#475569;">
                    Total: ${payments.length} Payments
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>User Details</th>
                        <th>Course / Mock Pack</th>
                        <th>Amount</th>
                        <th>Order ID / UTR</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => {
                        const status = (p.status || 'pending').toLowerCase();
                        let badgeStyle = 'background:#fffbeb; color:#d97706; border:1px solid #fde68a;'; // pending
                        if (status === 'paid' || status === 'success' || status === 'approved') {
                            badgeStyle = 'background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;';
                        } else if (status === 'failed' || status === 'rejected') {
                            badgeStyle = 'background:#fef2f2; color:#991b1b; border:1px solid #fecaca;';
                        }
                        
                        return `
                        <tr>
                            <td>
                                <div style="font-weight:600; font-size:0.9rem;">${formatDate(p.createdAt)}</div>
                            </td>
                            <td>
                                <div style="font-weight:600;">${p.name || p.userId?.name || 'User'}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${p.email || p.userId?.email || 'N/A'}</div>
                            </td>
                            <td>
                                <div style="max-width:250px; font-weight:500; overflow:hidden; text-overflow:ellipsis;">
                                    ${p.courseName || p.itemType || 'Premium Access'}
                                </div>
                            </td>
                            <td style="font-weight:700; color:#0f172a;">₹${p.amount}</td>
                            <td>
                                <code style="font-size:0.8rem; background:#f8fafc; padding:2px 5px; border-radius:4px;">${p.orderId || p.utr || 'N/A'}</code>
                            </td>
                            <td>
                                <span class="admin-badge" style="${badgeStyle}">
                                    ${status.toUpperCase()}
                                </span>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            ${payments.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No payments found.</div>' : ''}
        </div>
    `;
}

function renderLeaderboard(results) {
    const content = document.getElementById('content-area');
    
    // Sort results by score (descending) and then time (ascending)
    const sorted = [...results].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTaken - b.timeTaken;
    });

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Global Leaderboard (Daily Challenge)</h3>
                <div style="background:#f0f9ff; color:#0369a1; padding:5px 15px; border-radius:20px; font-weight:600; font-size:0.85rem;">
                    Top Performers: ${sorted.length}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th style="width:80px;">Rank</th>
                        <th>Student Name</th>
                        <th>Score (%)</th>
                        <th>Time Taken</th>
                        <th>Test Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map((r, i) => {
                        const rankColor = i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : '#475569'));
                        const rankBg = i === 0 ? '#fef3c7' : (i === 1 ? '#f1f5f9' : (i === 2 ? '#ffedd5' : 'transparent'));
                        
                        return `
                        <tr>
                            <td>
                                <div style="width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:${rankBg}; color:${rankColor}; font-weight:800; border:1px solid ${rankColor}33;">
                                    ${i + 1}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight:600;">${r.userId?.name || 'Guest Student'}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${r.userId?.email || 'Guest Attempt'}</div>
                            </td>
                            <td style="font-weight:700; color:#166534;">
                                ${Math.round((r.score / (r.total || 100)) * 100)}%
                                <div style="width:100px; height:6px; background:#f1f5f9; border-radius:3px; margin-top:5px;">
                                    <div style="width:${(r.score / (r.total || 100)) * 100}%; height:100%; background:#10b981; border-radius:3px;"></div>
                                </div>
                            </td>
                            <td>
                                <span style="font-family:monospace; background:#f8fafc; padding:2px 6px; border-radius:4px;">
                                    ${r.timeTaken || 0}s
                                </span>
                            </td>
                            <td>
                                <div style="font-size:0.9rem; color:#475569;">${new Date(r.createdAt || r.timestamp).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            ${sorted.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No leaderboard data available yet.</div>' : ''}
        </div>
    `;
}

function renderCertificates(certs) {
    const content = document.getElementById('content-area');
    
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Certificates Issued</h3>
                <div style="background:#fdf4ff; color:#a21caf; padding:5px 15px; border-radius:20px; font-weight:600; font-size:0.85rem; border:1px solid #f5d0fe;">
                    Total Issued: ${certs.length}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Student Name</th>
                        <th>Course Completed</th>
                        <th>Certificate ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${certs.map(c => `
                        <tr>
                            <td>
                                <div style="font-weight:600; color:#475569;">${formatDate(c.updatedAt || c.createdAt)}</div>
                            </td>
                            <td>
                                <div style="font-weight:600;">${c.userId?.name || 'Anonymous User'}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${c.userId?.email || 'N/A'}</div>
                            </td>
                            <td>
                                <div style="font-weight:600; color:#4f46e5;"><i class="fas fa-graduation-cap"></i> ${c.courseName}</div>
                            </td>
                            <td>
                                <code style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:0.8rem; border:1px solid #e2e8f0;">${c.certId || 'GEN-PENDING'}</code>
                            </td>
                            <td>
                                <a href="verify-certificate.html?id=${c.certId}" target="_blank" class="btn btn-sm btn-outline">
                                    <i class="fas fa-external-link-alt"></i> View Certificate
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${certs.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No certificates issued yet.</div>' : ''}
        </div>
    `;
}

function renderAuditLogs(logs) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <table class="admin-table">
                <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
                <tbody>
                    ${logs.map(l => `
                        <tr>
                            <td>${new Date(l.createdAt).toLocaleString()}</td>
                            <td>${l.adminEmail}</td>
                            <td><span class="admin-badge" style="background:#fef3c7; color:#d97706">${l.action}</span></td>
                            <td>${l.targetModel}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderMarketplace(books) {
    const content = document.getElementById('content-area');
    
    // Platform Commission (10%)
    const commissionRate = 0.10; 

    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #f1f5f9; padding-bottom:15px; margin-bottom:20px;">
                <div>
                    <h3 style="margin:0; font-size:1.4rem;">Marketplace Inventory (Used Books)</h3>
                    <p style="margin:5px 0 0; color:#64748b; font-size:0.85rem;">Monitoring ${books.length} active peer-to-peer listings.</p>
                </div>
                <div style="background:#f0fdf4; color:#166534; padding:8px 20px; border-radius:30px; font-weight:700; font-size:0.9rem; border:1px solid #bbf7d0;">
                    Live on Store: ${books.length}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th style="width:280px;">Book & Author</th>
                        <th>College & Category</th>
                        <th>Price</th>
                        <th>Seller Details</th>
                        <th>Commission (10%)</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${books.map(b => {
                        const price = b.price || 0;
                        const commission = (price * commissionRate).toFixed(0);
                        const sellerPayout = (price - commission).toFixed(0);
                        const statusColor = b.status === 'active' ? '#10b981' : '#ef4444';
                        
                        return `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:50px; height:65px; background:#f8fafc; border-radius:6px; overflow:hidden; border:1px solid #e2e8f0; flex-shrink:0;">
                                        <img src="/uploads/books/${b.image}" onerror="this.src='images/book-placeholder.png'" style="width:100%; height:100%; object-fit:cover;">
                                    </div>
                                    <div>
                                        <div style="font-weight:700; color:#1e293b; line-height:1.2; margin-bottom:4px;">${b.title}</div>
                                        <div style="font-size:0.75rem; color:#6366f1; font-weight:600;">by ${b.author || 'Unknown'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-weight:600; font-size:0.85rem; color:#334155;">${b.category}</div>
                                <div style="font-size:0.7rem; color:#64748b; margin-top:2px;"><i class="fas fa-university"></i> ${b.college || 'N/A'}</div>
                                <div style="display:inline-block; font-size:0.65rem; background:#f1f5f9; color:#475569; padding:1px 6px; border-radius:4px; margin-top:4px;">
                                    ${b.condition || 'Used'}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight:700; color:#0f172a; font-size:1.1rem;">₹${price}</div>
                            </td>
                            <td>
                                <div style="font-weight:600; color:#1e293b; font-size:0.85rem;">${b.sellerName || 'Anonymous'}</div>
                                <div style="font-size:0.75rem; color:#64748b;"><i class="fab fa-whatsapp" style="color:#25d366"></i> ${b.contactNumber || b.whatsapp || 'N/A'}</div>
                                <div style="font-size:0.7rem; color:#64748b;">${b.sellerEmail || ''}</div>
                            </td>
                            <td>
                                <div style="font-weight:700; color:#059669; font-size:0.95rem;">+ ₹${commission}</div>
                                <div style="font-size:0.65rem; color:#94a3b8;">Payout: ₹${sellerPayout}</div>
                            </td>
                            <td>
                                <span class="admin-badge" style="background:${b.status === 'active' ? '#f0fdf4' : '#fef2f2'}; color:${statusColor}; border:1px solid ${statusColor}44; font-size:0.7rem; padding:4px 10px;">
                                    ${b.status.toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm" onclick="deleteMarketplaceBook('${b._id}')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; font-size: 0.8rem; transition: background 0.2s;">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            ${books.length === 0 ? '<div style="padding:50px; text-align:center; color:#94a3b8;"><i class="fas fa-book-open" style="font-size:3rem; margin-bottom:15px; opacity:0.3;"></i><br>No book listings found in UsedBooks.</div>' : ''}
        </div>
    `;
}

// Additional functions from previous version like editCourse, deleteCourse, etc.
async function deleteMarketplaceBook(id) {
    if (!confirm('Are you sure you want to delete this listing as Admin?')) return;
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_BASE}/marketplace/books/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            alert('Listing deleted successfully!');
            loadView('marketplace');
        } else {
            alert(data.message || 'Failed to delete listing.');
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function editCourse(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/courses/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.ok && data.course) {
            renderCourseModal('Edit Course', data.course);
        } else {
            alert(data.message || 'Course not found');
        }
    } catch (err) {
        alert('Error loading course details: ' + err.message);
    }
}

async function deleteCourse(id) { if(confirm('Delete course?')) { const token = localStorage.getItem('token'); await fetch(`${API_BASE}/courses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); loadView('courses'); } }
function showBulkUploadModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 600px; width: 90%; padding: 30px;">
            <div class="card-header" style="margin-bottom: 20px;">
                <h3>Bulk Question Upload</h3>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            <div class="form-group">
                <label>JSON Array</label>
                <textarea id="bulkJson" class="admin-input" style="height: 300px; font-family: monospace;" placeholder='[ { "question": "...", "options": [...], "correctAnswer": "...", "category": "...", "subject": "..." } ]'></textarea>
            </div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="handleBulkUpload()">Upload Questions</button>
            </div>
        </div>
    `;
    modalContainer.classList.add('active');
}

async function handleBulkUpload() {
    const jsonStr = document.getElementById('bulkJson').value;
    try {
        const data = JSON.parse(jsonStr);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.ok) {
            alert(`Successfully uploaded ${result.count || 1} questions!`);
            closeModal();
            loadView('questions');
        } else alert(result.message);
    } catch (e) { alert('Invalid JSON format'); }
}

function showPdfUploadModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 600px; width: 90%; padding: 30px;">
            <div class="card-header" style="margin-bottom: 20px;">
                <h3>Import Questions from PDF</h3>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            <div class="form-group">
                <label>Select PDF File</label>
                <input type="file" id="pdfFile" class="admin-input" accept=".pdf" style="padding:10px;">
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">
                    Supports scanned PDFs (OCR), Hindi, English, and bilingual contents.
                </p>
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Target Mock Test Pack (Optional)</label>
                <select id="pdfMockPack" class="admin-input" onchange="handleMockPackChange()">
                    <option value="">-- Do not link to a mock test (Upload to Question Bank only) --</option>
                </select>
            </div>
            <div class="form-group" style="margin-top: 15px; display: none;" id="pdfMockTestRow">
                <label>Target Specific Test (Required if Pack is selected)</label>
                <select id="pdfMockTest" class="admin-input">
                    <option value="">-- Select Test --</option>
                </select>
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Default Category (Fallback)</label>
                <input type="text" id="pdfCategory" class="admin-input" placeholder="e.g. SSC, NEET, JEE, Banking, UPSC (Optional)">
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Default Subject (Fallback)</label>
                <input type="text" id="pdfSubject" class="admin-input" placeholder="e.g. Mathematics, Physics, English, History (Optional)">
            </div>
            <div id="pdf-status" style="margin-top:15px; font-size:0.9rem;"></div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 25px;">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="pdfUploadBtn" onclick="handlePdfUpload()">Import Questions</button>
            </div>
        </div>
    `;
    modalContainer.classList.add('active');

    // Fetch and populate Mock Test Packs
    (async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/mock-tests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok && data.packs) {
                window.allMockTestPacks = data.packs;
                const packSelect = document.getElementById('pdfMockPack');
                data.packs.forEach(pack => {
                    const opt = document.createElement('option');
                    opt.value = pack.id;
                    opt.textContent = `${pack.title} (${pack.category})`;
                    packSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load mock tests in modal:', err);
        }
    })();
}

function handleMockPackChange() {
    const packSelect = document.getElementById('pdfMockPack');
    const testRow = document.getElementById('pdfMockTestRow');
    const testSelect = document.getElementById('pdfMockTest');
    const categoryInp = document.getElementById('pdfCategory');

    const selectedPackId = packSelect.value;
    testSelect.innerHTML = '<option value="">-- Select Test --</option>';

    if (!selectedPackId) {
        testRow.style.display = 'none';
        return;
    }

    const pack = (window.allMockTestPacks || []).find(p => p.id === selectedPackId);
    if (pack) {
        testRow.style.display = 'block';
        if (pack.category) {
            categoryInp.value = pack.category;
        }
        if (pack.tests && pack.tests.length > 0) {
            pack.tests.forEach(test => {
                const opt = document.createElement('option');
                opt.value = test.testId;
                opt.textContent = `${test.testTitle} (${test.numQuestions || 0} questions)`;
                testSelect.appendChild(opt);
            });
        }
    } else {
        testRow.style.display = 'none';
    }
}

async function handlePdfUpload() {
    const fileInp = document.getElementById('pdfFile');
    const categoryInp = document.getElementById('pdfCategory');
    const subjectInp = document.getElementById('pdfSubject');
    const packSelect = document.getElementById('pdfMockPack');
    const testSelect = document.getElementById('pdfMockTest');
    const status = document.getElementById('pdf-status');
    const btn = document.getElementById('pdfUploadBtn');

    if (!fileInp.files[0]) return alert('Please select a PDF file');

    if (packSelect.value && !testSelect.value) {
        return alert('Please select the specific test to import questions into');
    }

    const formData = new FormData();
    formData.append('pdf', fileInp.files[0]);
    formData.append('category', categoryInp.value.trim());
    formData.append('subject', subjectInp.value.trim());
    formData.append('packId', packSelect.value);
    formData.append('testId', testSelect.value);

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading PDF...';
    status.innerHTML = '<div style="color:var(--primary); font-weight:500;"><i class="fas fa-spinner fa-spin"></i> Uploading PDF and queueing import...</div>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/generate-questions-from-pdf`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            const errorMsg = await getFetchErrorMessage(res);
            status.innerHTML = `<span style="color:var(--danger)">Error: ${errorMsg}</span>`;
            btn.disabled = false;
            btn.textContent = 'Try Again';
            return;
        }

        const data = await res.json();
        if (!data.ok || !data.jobId) {
            throw new Error(data.message || 'No job ID received.');
        }

        status.innerHTML = `
            <div class="pdf-progress-container" style="border-top:1px solid var(--border-color); margin-top:20px; padding-top:20px; display:flex; flex-direction:column; gap:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:600;">
                    <span class="pdf-job-stage" style="color:var(--primary);"><i class="fas fa-spinner fa-spin"></i> Processing PDF...</span>
                    <span class="pdf-job-pct" style="color:var(--text-main);">0%</span>
                </div>
                <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                    <div class="pdf-job-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #4f46e5, #06b6d4); transition:width 0.3s;"></div>
                </div>
                
                <div class="pdf-job-stats-grid" style="display:none; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size:0.8rem; text-align:center;">
                    <div style="background:#f1f5f9; padding:8px; border-radius:6px; border:1px solid var(--border-color);">
                        <div style="color:var(--text-muted); font-size:0.7rem; font-weight:500;">Total</div>
                        <strong class="stat-total" style="font-size:1.1rem; color:var(--text-main);">0</strong>
                    </div>
                    <div style="background:rgba(16, 185, 129, 0.05); padding:8px; border-radius:6px; border:1px solid rgba(16, 185, 129, 0.1);">
                        <div style="color:#10b981; font-size:0.7rem; font-weight:500;">Valid</div>
                        <strong class="stat-valid" style="font-size:1.1rem; color:#10b981;">0</strong>
                    </div>
                    <div style="background:rgba(245, 158, 11, 0.05); padding:8px; border-radius:6px; border:1px solid rgba(245, 158, 11, 0.1);">
                        <div style="color:#f59e0b; font-size:0.7rem; font-weight:500;">Duplicates</div>
                        <strong class="stat-dup" style="font-size:1.1rem; color:#f59e0b;">0</strong>
                    </div>
                    <div style="background:rgba(239, 68, 68, 0.05); padding:8px; border-radius:6px; border:1px solid rgba(239, 68, 68, 0.1);">
                        <div style="color:#ef4444; font-size:0.7rem; font-weight:500;">Warnings</div>
                        <strong class="stat-warn" style="font-size:1.1rem; color:#ef4444;">0</strong>
                    </div>
                </div>
                
                <div style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">Execution Logs:</div>
                <div class="pdf-job-logs-terminal" style="height:120px; background:#0f172a; color:#e2e8f0; border-radius:8px; padding:10px; font-family:monospace; font-size:0.75rem; overflow-y:auto; display:flex; flex-direction:column; gap:4px; border: 1px solid var(--border-color); text-align:left;">
                    <div>[System] Initializing connection...</div>
                </div>
                
                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn btn-sm btn-outline danger" id="pdfCancelBtn" style="border-color:#ef4444; color:#ef4444;">
                        <i class="fas fa-times"></i> Cancel Job
                    </button>
                </div>
            </div>
        `;

        pollJob(data.jobId,
            (progress, stage, logs) => {
                const stageEl = status.querySelector('.pdf-job-stage');
                const pctEl = status.querySelector('.pdf-job-pct');
                const barEl = status.querySelector('.pdf-job-progress-bar');
                const terminalEl = status.querySelector('.pdf-job-logs-terminal');
                
                if (stageEl) stageEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${stage}`;
                if (pctEl) pctEl.textContent = `${progress}%`;
                if (barEl) barEl.style.width = `${progress}%`;
                
                if (terminalEl && Array.isArray(logs)) {
                    terminalEl.innerHTML = logs.map(l => `<div style="line-height:1.4;">${escapeHtml(l)}</div>`).join('');
                    terminalEl.scrollTop = terminalEl.scrollHeight;
                }
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Parsing... ${progress}%`;
            },
            (result) => {
                status.innerHTML = `<span style="color:var(--success)">✅ Processing completed! Loading preview...</span>`;
                btn.disabled = false;
                btn.textContent = 'Import PDF';

                showQuestionsPreviewModal(result.questions, result.stats || {}, async (editedQuestions, replaceDuplicates) => {
                    const saveRes = await fetch(`${API_BASE}/questions?replaceDuplicates=${replaceDuplicates}`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            questions: editedQuestions,
                            packId: packSelect.value,
                            testId: testSelect.value
                        })
                    });

                    if (!saveRes.ok) {
                        const errText = await getFetchErrorMessage(saveRes);
                        throw new Error(errText);
                    }

                    const saveData = await saveRes.json();
                    if (!saveData.ok) {
                        throw new Error(saveData.message || 'DB save failed');
                    }

                    // Show success stats modal
                    const modalContainer = document.getElementById('modal-container');
                    const skippedListHtml = saveData.skippedQuestions && saveData.skippedQuestions.length > 0
                        ? `<div style="margin-top: 15px;">
                                <span style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:6px; color:#b91c1c;">Skipped / Invalid Questions Details:</span>
                                <div style="max-height:150px; overflow-y:auto; background:#fff5f5; border:1px solid #fee2e2; border-radius:6px; padding:10px; font-size:0.75rem; display:flex; flex-direction:column; gap:6px;">
                                    ${saveData.skippedQuestions.map(s => `
                                        <div style="border-bottom:1px solid #fee2e2; padding-bottom:4px; text-align:left;">
                                            <strong>Q${s.questionNumber}:</strong> <span style="color:#ef4444; font-weight:600;">[${s.reason}]</span> - ${escapeHtml(s.question || '').substring(0, 80)}...
                                        </div>
                                    `).join('')}
                                </div>
                           </div>`
                        : '';

                    modalContainer.innerHTML = `
                        <div class="modal-content admin-card" style="max-width: 700px; width: 90%; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
                            <div class="card-header" style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; text-align:left;">
                                <h3 style="color: #10b981; display: flex; align-items: center; gap: 10px; margin:0;">
                                    <i class="fas fa-check-circle"></i> Import Completed Successfully!
                                </h3>
                                <p style="font-size:0.8rem; color:var(--text-muted); margin:4px 0 0 0;">All valid questions were successfully written to MongoDB.</p>
                            </div>
                            <div class="stats-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                                <div class="stat-card" style="padding: 15px; text-align: center; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Total Questions</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: var(--text-main);">${saveData.count + saveData.skippedCount}</h2>
                                </div>
                                <div class="stat-card" style="padding: 15px; text-align: center; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: #10b981; font-weight: 500;">Saved (Insert/Update)</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: #10b981;">${saveData.count - (replaceDuplicates ? 0 : saveData.duplicateCount)}</h2>
                                </div>
                                <div class="stat-card" style="padding: 15px; text-align: center; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.1); border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 500;">Duplicates Detected</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: #f59e0b;">${saveData.duplicateCount || 0}</h2>
                                </div>
                                <div class="stat-card" style="padding: 15px; text-align: center; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: #ef4444; font-weight: 500;">Skipped Questions</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: #ef4444;">${saveData.skippedCount || 0}</h2>
                                </div>
                                <div class="stat-card" style="padding: 15px; text-align: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: #1d4ed8; font-weight: 500;">OCR Pages Run</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: #1d4ed8;">${window.currentPreviewQuestions.filter(pq => pq.ocrUsed).length}</h2>
                                </div>
                                <div class="stat-card" style="padding: 15px; text-align: center; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 8px;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Execution Time</span>
                                    <h2 style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: 700; color: var(--text-main);">${((saveData.timeMs || 0) / 1000).toFixed(2)}s</h2>
                                </div>
                            </div>
                            
                            ${skippedListHtml}
                            
                            <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 20px; margin-top:20px;">
                                <button class="btn btn-primary" onclick="closeModal(); loadView('questions');">Done</button>
                            </div>
                        </div>
                    `;
                });
            },
            (err) => {
                status.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
                btn.disabled = false;
                btn.textContent = 'Try Again';
            }
        );

        const cancelBtn = status.querySelector('#pdfCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to cancel the PDF import job?')) {
                    try {
                        cancelBtn.disabled = true;
                        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
                        const cancelRes = await fetch(`${API_BASE}/pdf-jobs/${data.jobId}/cancel`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const cancelData = await cancelRes.json();
                        if (cancelData.ok) {
                            status.innerHTML = `<span style="color:var(--danger)">⚠️ Job cancelled by administrator.</span>`;
                            btn.disabled = false;
                            btn.textContent = 'Import PDF';
                        } else {
                            alert('Failed to cancel job: ' + (cancelData.message || 'Unknown error'));
                            cancelBtn.disabled = false;
                            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Job';
                        }
                    } catch (cancelErr) {
                        alert('Error during cancellation: ' + cancelErr.message);
                        cancelBtn.disabled = false;
                        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Job';
                    }
                }
            });
        }
    } catch (e) {
        status.innerHTML = `<span style="color:var(--danger)">Failed to process PDF: ${e.message}</span>`;
        btn.disabled = false;
        btn.textContent = 'Try Again';
    }
}

async function deleteMockTest(id) { 
    if(confirm('Delete pack?')) { 
        const token = localStorage.getItem('token'); 
        await fetch(`${API_BASE}/mock-tests/${id}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` } 
        }); 
        loadView('mock-tests'); 
    } 
}

// ── SLIDESHOW BANNER MANAGEMENT VIEWS ─────────────────────────────────

function renderSlides(slides = []) {
    const content = document.getElementById('content-area');
    
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>Homepage Slideshow Banners</h3>
                <button class="btn btn-primary" onclick="showAddSlideModal()">+ Add New Slide</button>
            </div>
            
            <div style="padding: 24px;">
                <p style="margin-bottom: 20px; color: var(--text-muted); font-size: 0.9rem;">
                    Banners appear in the homepage visual section. Recommended image size: 800x450 pixels (approx. 16:9 ratio) or wide landscape. Seeding default banners provides gorgeous gradient cards by default.
                </p>
                
                <div class="slides-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                    ${slides.length === 0 ? `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                            <i class="fas fa-images" style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px;"></i>
                            <p>No slides found. Click '+ Add New Slide' to create one.</p>
                        </div>
                    ` : slides.map(s => {
                        const isDefault = s.image.startsWith('default_slide');
                        const imgUrl = isDefault ? '#' : `/uploads/slides/${s.image}`;
                        
                        return `
                            <div class="admin-card slide-manage-card" style="display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                                <div class="slide-preview-box" style="height: 150px; position: relative; overflow: hidden; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); display: flex; align-items: center; justify-content: center; color: white; padding: 15px; text-align: center;">
                                    ${isDefault ? `
                                        <div>
                                            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${s.title}</div>
                                            <div style="font-size: 0.75rem; opacity: 0.9; max-width: 250px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.subtitle}</div>
                                            <div style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 600;">Seeded Banner</div>
                                        </div>
                                    ` : `
                                        <img src="${imgUrl}" alt="${s.title}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1;">
                                        <div style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.65); color: white; padding: 8px; z-index: 2; font-size: 0.75rem; text-align: left;">
                                            <strong style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.title}</strong>
                                        </div>
                                    `}
                                </div>
                                <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
                                    <div><strong>Title:</strong> ${s.title}</div>
                                    <div><strong>Subtitle:</strong> <span class="text-muted">${s.subtitle || '—'}</span></div>
                                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Link:</strong> <a href="${s.link || '#'}" target="_blank" style="color: var(--primary); text-decoration: none;">${s.link || '—'}</a></div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);">
                                        <span><strong>Order:</strong> ${s.order}</span>
                                        <span class="admin-badge" style="background: ${s.isActive ? '#ecfdf5' : '#fee2e2'}; color: ${s.isActive ? '#10b981' : '#ef4444'}">
                                            ${s.isActive ? 'Active' : 'Hidden'}
                                        </span>
                                    </div>
                                </div>
                                <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end;">
                                    <button class="btn btn-sm btn-outline" onclick="editSlide('${s._id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-outline danger" onclick="deleteSlide('${s._id}')" style="color: var(--danger)">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function showAddSlideModal() {
    renderSlideModal('Add New Slide Banner');
}

async function editSlide(id) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/slides/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok && data.slide) {
            renderSlideModal('Edit Slide Banner', data.slide);
        } else {
            alert(data.message || 'Slide banner not found');
        }
    } catch (err) {
        alert('Error loading slide details: ' + err.message);
    }
}

function renderSlideModal(title, slide = null) {
    const modalContainer = document.getElementById('modal-container');
    const isEdit = !!slide;

    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 550px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
            <div class="card-header">
                <h3>${title}</h3>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            
            <form id="slideForm" style="flex: 1; overflow-y: auto; padding: 24px;">
                <div class="form-group">
                    <label>Slide Title *</label>
                    <input type="text" id="slideTitle" class="admin-input" value="${slide?.title || ''}" required placeholder="e.g. Special Discount Offer">
                </div>
                
                <div class="form-group">
                    <label>Subtitle / Description</label>
                    <textarea id="slideSubtitle" class="admin-input" style="height: 60px;" placeholder="e.g. Get up to 40% off on premium batches. Limited time only.">${slide?.subtitle || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Banner Image File * ${isEdit ? '(Leave empty to keep existing)' : ''}</label>
                    <input type="file" id="slideImage" class="admin-input" accept="image/*" ${isEdit ? '' : 'required'}>
                    ${slide ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Current: ${slide.image}</div>` : ''}
                </div>
                
                <div class="form-group">
                    <label>Action Redirection Link</label>
                    <input type="text" id="slideLink" class="admin-input" value="${slide?.link || ''}" placeholder="e.g. /certificates.html or https://www.google.com">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label>Display Order Sequence</label>
                        <input type="number" id="slideOrder" class="admin-input" value="${slide?.order || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Visibility Status</label>
                        <select id="slideActive" class="admin-input">
                            <option value="true" ${slide?.isActive !== false ? 'selected' : ''}>Active / Visible</option>
                            <option value="false" ${slide?.isActive === false ? 'selected' : ''}>Inactive / Hidden</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 20px;">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Slide'}</button>
                </div>
            </form>
        </div>
    `;
    
    modalContainer.classList.add('active');
    
    document.getElementById('slideForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSlideSubmit(slide?._id);
    });
}

async function handleSlideSubmit(id) {
    const isEdit = !!id;
    const token = localStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('title', document.getElementById('slideTitle').value);
    formData.append('subtitle', document.getElementById('slideSubtitle').value);
    formData.append('link', document.getElementById('slideLink').value);
    formData.append('order', document.getElementById('slideOrder').value);
    formData.append('isActive', document.getElementById('slideActive').value);
    
    const fileInput = document.getElementById('slideImage');
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }
    
    const submitBtn = document.querySelector('#slideForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    try {
        const url = isEdit ? `${API_BASE}/slides/${id}` : `${API_BASE}/slides`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await res.json();
        if (data.ok) {
            closeModal();
            loadView('slides');
        } else {
            alert(`Error: ${data.message || 'Operation failed'}`);
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Slide';
        }
    } catch (err) {
        alert('Network error while saving slide banner');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Slide';
    }
}

async function deleteSlide(id) {
    if (confirm('Are you sure you want to permanently delete this slide banner?')) {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/slides/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok) {
                loadView('slides');
            } else {
                alert(`Delete failed: ${data.message}`);
            }
        } catch (e) {
            alert('Network error deleting slide banner');
        }
    }
}

// ── COMMUNITY MODERATION & BROADCAST NOTIFICATIONS ─────────────

function renderCommunityAdmin(posts, doubts) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="modal-tabs" style="margin-bottom:20px;">
            <button class="modal-tab-btn active" id="btn-tab-posts" onclick="switchCommunityTab('posts')">Posts (${posts.length})</button>
            <button class="modal-tab-btn" id="btn-tab-doubts" onclick="switchCommunityTab('doubts')">Doubts (${doubts.length})</button>
        </div>
        
        <div id="admin-posts-container" class="admin-card community-tab-content" style="padding:24px;">
            <div class="card-header" style="margin-bottom: 15px;">
                <h3>Community Feed Posts</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Category</th>
                        <th>Likes / Comments</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${posts.map(p => `
                        <tr>
                            <td><strong>${p.title}</strong></td>
                            <td>${p.username}</td>
                            <td><span class="admin-badge">${p.category}</span></td>
                            <td>${p.likesCount} Likes / ${p.commentsCount} Comments</td>
                            <td>
                                <button class="btn btn-sm btn-outline danger" onclick="deleteCommunityItem('${p._id}', 'post')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${posts.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No posts in the community.</div>' : ''}
        </div>
        
        <div id="admin-doubts-container" class="admin-card community-tab-content" style="display:none; padding:24px;">
            <div class="card-header" style="margin-bottom: 15px;">
                <h3>Community Doubts</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Doubt / Question</th>
                        <th>Author</th>
                        <th>Answers</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${doubts.map(d => `
                        <tr>
                            <td><strong>${d.question}</strong></td>
                            <td>${d.username}</td>
                            <td>${d.answers.length} Answers</td>
                            <td>
                                <span class="admin-badge" style="background:${d.bestAnswer ? '#ecfdf5' : '#eff6ff'}; color:${d.bestAnswer ? '#10b981' : '#3b82f6'}">
                                    ${d.bestAnswer ? 'Solved' : 'Open'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline danger" onclick="deleteCommunityItem('${d._id}', 'doubt')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${doubts.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No doubts in the community.</div>' : ''}
        </div>
    `;
}

function switchCommunityTab(tab) {
    document.querySelectorAll('.community-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'posts') {
        document.getElementById('admin-posts-container').style.display = 'block';
        document.getElementById('btn-tab-posts').classList.add('active');
    } else {
        document.getElementById('admin-doubts-container').style.display = 'block';
        document.getElementById('btn-tab-doubts').classList.add('active');
    }
}

async function deleteCommunityItem(id, type) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/community/${type === 'post' ? 'posts' : 'doubts'}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            alert(`${type.toUpperCase()} deleted successfully!`);
            loadView('community');
        } else {
            alert(data.message || `Failed to delete ${type}`);
        }
    } catch (e) {
        console.error(e);
        alert(`Error deleting ${type}`);
    }
}

function renderNotificationsAdmin(announcements) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="grid-column: span 2; padding:24px;">
                <div class="stat-info" style="width:100%;">
                    <h3>Create Broadcast Notification</h3>
                    <p style="margin-bottom:20px; color:var(--text-muted);">Send a global announcement to all users in the community.</p>
                    <div style="display:flex; flex-direction:column; gap:15px; max-width:600px;">
                        <textarea id="announcementMessage" class="admin-input" style="height:120px;" placeholder="Type your announcement message here..."></textarea>
                        <button class="btn btn-primary" onclick="submitAnnouncement()" style="align-self:flex-start;">Publish Notification</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="admin-card" style="margin-top:30px; padding:24px;">
            <div class="card-header" style="margin-bottom: 15px;">
                <h3>Sent Announcements</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Message</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${announcements.map(a => `
                        <tr>
                            <td style="white-space:nowrap;">${new Date(a.createdAt).toLocaleString()}</td>
                            <td style="line-height:1.4;">${a.message}</td>
                            <td>
                                <button class="btn btn-sm btn-outline danger" onclick="deleteAnnouncement('${a._id}')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${announcements.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No announcements sent yet.</div>' : ''}
        </div>
    `;
}

async function submitAnnouncement() {
    const message = document.getElementById('announcementMessage').value.trim();
    if (!message) return alert('Please enter a message');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.ok) {
            alert('Notification published successfully!');
            loadView('notifications');
        } else {
            alert(data.message || 'Failed to publish notification');
        }
    } catch (e) {
        console.error(e);
        alert('Error publishing announcement');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            alert('Announcement deleted successfully!');
            loadView('notifications');
        } else {
            alert(data.message || 'Failed to delete announcement');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting announcement');
    }
}

function renderFeedbackAdmin(feedbacks) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card" style="padding:24px;">
            <div class="card-header" style="margin-bottom: 15px;">
                <h3>Student Feedback</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Rating</th>
                        <th>Message</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${feedbacks.map(fb => `
                        <tr>
                            <td style="white-space:nowrap;">${new Date(fb.createdAt).toLocaleDateString()}</td>
                            <td><strong>${fb.name}</strong></td>
                            <td><span class="stars" style="color:#fbbf24;">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</span></td>
                            <td style="max-width:300px; line-height:1.4;">${fb.message}</td>
                            <td>
                                <button class="btn btn-sm btn-outline danger" onclick="deleteFeedback('${fb._id}')" style="color:var(--danger)">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${feedbacks.length === 0 ? '<div style="padding:40px; text-align:center; color:#64748b;">No feedback received yet.</div>' : ''}
        </div>
    `;
}

async function deleteFeedback(id) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/feedback/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            alert('Feedback deleted successfully!');
            loadView('feedback');
        } else {
            alert(data.message || 'Failed to delete feedback');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting feedback');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ADMIN PANEL
// Full broadcast center with analytics, history, and targeted sending
// ─────────────────────────────────────────────────────────────────────────────

function renderNotificationsAdmin(analytics = {}, history = []) {
    const content = document.getElementById('content-area');

    // Analytics summary
    const total = analytics.total || 0;
    const opened = analytics.opened || 0;
    const clicked = analytics.clicked || 0;
    const pushSent = analytics.pushSent || 0;
    const deliveryRate = analytics.deliveryRate || 0;
    const ctr = analytics.ctr || 0;

    content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:28px;">

        <!-- Analytics Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#4f46e5"><i class="fas fa-bell"></i></div>
                <div class="stat-info"><h3>${total.toLocaleString()}</h3><p>Total Sent</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#10b981"><i class="fas fa-eye"></i></div>
                <div class="stat-info"><h3>${opened.toLocaleString()}</h3><p>Opened</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#f59e0b"><i class="fas fa-mouse-pointer"></i></div>
                <div class="stat-info"><h3>${clicked.toLocaleString()}</h3><p>Clicked</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#6366f1"><i class="fas fa-mobile-alt"></i></div>
                <div class="stat-info"><h3>${pushSent.toLocaleString()}</h3><p>Push Sent</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#0ea5e9"><i class="fas fa-chart-line"></i></div>
                <div class="stat-info"><h3>${deliveryRate}%</h3><p>Open Rate</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#ec4899"><i class="fas fa-hand-pointer"></i></div>
                <div class="stat-info"><h3>${ctr}%</h3><p>CTR</p></div>
            </div>
        </div>

        <!-- Broadcast Form -->
        <div class="table-container" style="border-radius:16px;overflow:visible;">
            <div class="table-header" style="padding:20px 24px 0;">
                <h3 style="margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-bullhorn" style="color:#4f46e5"></i> Send Notification</h3>
            </div>
            <div style="padding:20px 24px 24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">Title *</label>
                        <input type="text" id="notifTitle" placeholder="e.g. New SSC CGL Course Available!" maxlength="150"
                            style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box">
                    </div>
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">Action URL</label>
                        <input type="text" id="notifUrl" placeholder="e.g. /certificates or /daily-challenge"
                            style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box">
                    </div>
                </div>
                <div style="margin-top:14px;">
                    <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">Message *</label>
                    <textarea id="notifMessage" rows="3" placeholder="Enter your notification message..." maxlength="500"
                        style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;resize:vertical;box-sizing:border-box"></textarea>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px;">
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">Button Label</label>
                        <input type="text" id="notifActionLabel" placeholder="View, Claim Offer, Start Now..." value="View"
                            style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box">
                    </div>
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">Target</label>
                        <select id="notifTarget" style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;background:white;box-sizing:border-box">
                            <option value="all">All Users</option>
                            <option value="specific">Specific User IDs</option>
                        </select>
                    </div>
                </div>
                <div id="specificUsersRow" style="margin-top:14px;display:none;">
                    <label style="display:block;font-size:0.8rem;font-weight:600;color:#374151;margin-bottom:6px;">User IDs (comma-separated)</label>
                    <textarea id="notifUserIds" rows="2" placeholder="userId1, userId2, userId3..."
                        style="width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:0.85rem;outline:none;resize:none;box-sizing:border-box"></textarea>
                </div>
                <div style="margin-top:18px;display:flex;gap:10px;align-items:center;">
                    <button onclick="sendAdminNotification()" id="notifSendBtn"
                        style="padding:10px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:10px;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-paper-plane"></i> Send Now
                    </button>
                    <span id="notifSendStatus" style="font-size:0.8rem;color:#6b7280;"></span>
                </div>
            </div>
        </div>

        <!-- History Table -->
        <div class="table-container">
            <div class="table-header" style="padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;"><i class="fas fa-history" style="color:#4f46e5"></i> Notification History</h3>
                <span style="font-size:0.78rem;color:#6b7280;">${history.length} records</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>Type</th><th>Title</th><th>Message</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${history.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:30px;">No notifications sent yet</td></tr>` :
                        history.map(n => `
                        <tr>
                            <td><span style="background:#eef2ff;color:#4f46e5;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;">${n.type}</span></td>
                            <td style="font-weight:600;font-size:0.82rem;">${n.title || '-'}</td>
                            <td style="font-size:0.78rem;color:#6b7280;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n.message || '-'}</td>
                            <td style="font-size:0.78rem;color:#9ca3af;">${new Date(n.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                            <td>
                                <button onclick="deleteAdminNotification('${n._id}')" class="btn btn-danger" style="padding:4px 10px;font-size:0.72rem;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>`).join('')
                    }
                </tbody>
            </table>
        </div>
    </div>
    `;

    // Target select toggle
    document.getElementById('notifTarget')?.addEventListener('change', function() {
        document.getElementById('specificUsersRow').style.display = this.value === 'specific' ? 'block' : 'none';
    });
}

async function sendAdminNotification() {
    const title = document.getElementById('notifTitle')?.value?.trim();
    const message = document.getElementById('notifMessage')?.value?.trim();
    const actionUrl = document.getElementById('notifUrl')?.value?.trim() || '/';
    const actionLabel = document.getElementById('notifActionLabel')?.value?.trim() || 'View';
    const target = document.getElementById('notifTarget')?.value;
    const userIdsRaw = document.getElementById('notifUserIds')?.value?.trim();
    const statusEl = document.getElementById('notifSendStatus');
    const sendBtn = document.getElementById('notifSendBtn');

    if (!title || !message) {
        if (statusEl) statusEl.textContent = '⚠️ Title and message are required';
        return;
    }

    const payload = { title, message, actionUrl, actionLabel };

    if (target === 'specific' && userIdsRaw) {
        payload.targetUserIds = userIdsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; }
    if (statusEl) statusEl.textContent = '';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/notifications/broadcast`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.ok) {
            if (statusEl) statusEl.innerHTML = `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> ${data.message}</span>`;
            // Clear form
            ['notifTitle','notifMessage','notifUrl'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reload view after 2s
            setTimeout(() => loadView('notifications'), 2000);
        } else {
            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ ${data.message}</span>`;
        }
    } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ Failed to send notification</span>`;
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Now'; }
    }
}

async function deleteAdminNotification(id) {
    if (!confirm('Delete this notification?')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) loadView('notifications');
        else alert(data.message || 'Delete failed');
    } catch (e) {
        alert('Failed to delete notification');
    }
}

// ── Universal PDF Preview Modal and Edit System ─────────────────────────
window.showQuestionsPreviewModal = function(questions, stats, onConfirm) {
    if (typeof stats === 'function') {
        onConfirm = stats;
        stats = {};
    }
    window.currentPreviewQuestions = JSON.parse(JSON.stringify(questions));
    window.confirmPreviewImportCallback = onConfirm;

    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-content admin-card" style="max-width: 1000px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; padding: 0;">
            <div class="card-header" style="padding: 20px 24px; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:#fafafa; text-align:left;">
                <div>
                    <h3 style="margin:0;"><i class="fas fa-eye" style="color:var(--primary);"></i> Preview Extracted Questions</h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin: 4px 0 0 0;">Review and edit questions. Edits are auto-saved. Click "Save & Import Questions" to write to database.</p>
                </div>
                <button class="btn btn-icon" onclick="closeModal()">×</button>
            </div>
            
            <div class="stats-bar" style="padding: 12px 24px; background: white; border-bottom: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; font-size: 0.75rem; text-align: center; font-weight: 500;">
                <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <div style="color: var(--text-muted); font-size: 0.65rem;">Total</div>
                    <strong id="stats-total" style="font-size: 1rem; color: var(--text-main); font-weight: 700;">${stats.total || questions.length}</strong>
                </div>
                <div style="background: rgba(16, 185, 129, 0.05); padding: 6px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.1);">
                    <div style="color: #10b981; font-size: 0.65rem;">Valid</div>
                    <strong id="stats-valid" style="font-size: 1rem; color: #10b981; font-weight: 700;">${stats.valid !== undefined ? stats.valid : questions.length}</strong>
                </div>
                <div style="background: rgba(239, 68, 68, 0.05); padding: 6px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.1);">
                    <div style="color: #ef4444; font-size: 0.65rem;">Warnings</div>
                    <strong id="stats-warning" style="font-size: 1rem; color: #ef4444; font-weight: 700;">${stats.warning !== undefined ? stats.warning : 0}</strong>
                </div>
                <div style="background: rgba(245, 158, 11, 0.05); padding: 6px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.1);">
                    <div style="color: #f59e0b; font-size: 0.65rem;">Duplicates</div>
                    <strong id="stats-duplicate" style="font-size: 1rem; color: #f59e0b; font-weight: 700;">${stats.duplicate !== undefined ? stats.duplicate : 0}</strong>
                </div>
                <div style="background: #eff6ff; padding: 6px; border-radius: 6px; border: 1px solid #bfdbfe;">
                    <div style="color: #1d4ed8; font-size: 0.65rem;">OCR Run</div>
                    <strong id="stats-ocr" style="font-size: 1rem; color: #1d4ed8; font-weight: 700;">${stats.ocr !== undefined ? stats.ocr : 0}</strong>
                </div>
                <div style="background: rgba(239, 68, 68, 0.03); padding: 6px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.08);">
                    <div style="color: #ef4444; font-size: 0.65rem;">Corrupted (\\uFFFD)</div>
                    <strong id="stats-encoding" style="font-size: 1rem; color: #ef4444; font-weight: 700;">${stats.encodingErrors !== undefined ? stats.encodingErrors : 0}</strong>
                </div>
                <div style="background: rgba(245, 158, 11, 0.03); padding: 6px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.08);">
                    <div style="color: #f59e0b; font-size: 0.65rem;">Short Options</div>
                    <strong id="stats-missing-options" style="font-size: 1rem; color: #f59e0b; font-weight: 700;">${stats.missingOptions !== undefined ? stats.missingOptions : 0}</strong>
                </div>
                <div style="background: rgba(239, 68, 68, 0.03); padding: 6px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.08);">
                    <div style="color: #ef4444; font-size: 0.65rem;">No Ans</div>
                    <strong id="stats-missing-answers" style="font-size: 1rem; color: #ef4444; font-weight: 700;">${stats.missingAnswers !== undefined ? stats.missingAnswers : 0}</strong>
                </div>
            </div>
            
            <div class="preview-actions" style="padding: 15px 24px; background: #f8fafc; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap: 15px; flex-wrap: wrap;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <span class="badge badge-info" style="background:#e0e7ff; color:#4f46e5; padding:6px 12px; border-radius:20px; font-weight:600; font-size:0.8rem;">
                        Preview Count: <span id="preview-total-count">0</span>
                    </span>
                    <span class="badge badge-danger" id="preview-warning-badge" style="background:#fee2e2; color:#ef4444; padding:6px 12px; border-radius:20px; font-weight:600; font-size:0.8rem; display:none;">
                        Warnings: <span id="preview-warning-count">0</span>
                    </span>
                    <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:500; cursor:pointer; margin:0;">
                        <input type="checkbox" id="preview-replace-duplicates" style="width:16px; height:16px;">
                        Replace duplicates in database
                    </label>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-outline btn-sm" onclick="scrollToFirstError()" style="color:#ef4444; border-color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Find Next Error</button>
                    <button class="btn btn-outline btn-sm" onclick="addBlankQuestionToPreview()"><i class="fas fa-plus"></i> Add Question</button>
                    <button class="btn btn-primary btn-sm" id="preview-import-btn" onclick="confirmPreviewImport()"><i class="fas fa-save"></i> Save & Import Questions</button>
                </div>
            </div>
            
            <div id="preview-questions-list" style="flex: 1; overflow-y: auto; padding: 24px; display:flex; flex-direction:column; gap:20px; background:#f1f5f9;">
                <!-- Cards injected by renderPreviewList -->
            </div>
        </div>
    `;
    modalContainer.classList.add('active');
    renderPreviewList();

    // Auto-scroll to first error card on load
    setTimeout(() => {
        const errorCard = document.querySelector('.preview-q-card[style*="#ef4444"]');
        if (errorCard) {
            errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 400);
};

window.renderPreviewList = function() {
    const listContainer = document.getElementById('preview-questions-list');
    const totalCountEl = document.getElementById('preview-total-count');
    const warningBadge = document.getElementById('preview-warning-badge');
    const warningCountEl = document.getElementById('preview-warning-count');

    if (!listContainer) return;

    totalCountEl.textContent = window.currentPreviewQuestions.length;
    
    let warningCount = 0;
    listContainer.innerHTML = '';

    window.currentPreviewQuestions.forEach((q, idx) => {
        if (!q.isValid) warningCount++;
        listContainer.appendChild(createPreviewCardNode(q, idx));
    });

    if (warningCount > 0) {
        warningBadge.style.display = 'inline-block';
        warningCountEl.textContent = warningCount;
    } else {
        warningBadge.style.display = 'none';
    }
};

window.scrollToFirstError = function() {
    const errorCards = Array.from(document.querySelectorAll('.preview-q-card')).filter(card => {
        const cardId = card.id.replace('q-card-', '');
        const q = window.currentPreviewQuestions[parseInt(cardId)];
        return q && !q.isValid;
    });
    if (errorCards.length > 0) {
        const listContainer = document.getElementById('preview-questions-list');
        const containerTop = listContainer.getBoundingClientRect().top;
        const nextError = errorCards.find(card => card.getBoundingClientRect().top > containerTop + 20) || errorCards[0];
        nextError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const origBorder = nextError.style.borderColor;
        nextError.style.borderColor = '#b91c1c';
        setTimeout(() => nextError.style.borderColor = origBorder, 1000);
    } else {
        alert('🎉 All questions are valid!');
    }
};

window.createPreviewCardNode = function(q, idx) {
    const card = document.createElement('div');
    card.className = 'preview-q-card';
    card.id = `q-card-${idx}`;
    card.style = `background:white; border-radius:12px; border: ${q.isValid ? '1px solid var(--border-color)' : '2px solid #ef4444'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding:20px; position:relative; display:flex; flex-direction:column; gap:12px; text-align:left;`;

    // Render option input blocks with dynamic borders for required option blanks
    const optionsHtml = ['A', 'B', 'C', 'D', 'E', 'F'].map((letter, i) => {
        const value = q[`option${letter}`] || '';
        const isRequired = ['A', 'B', 'C', 'D'].includes(letter);
        const isMissing = isRequired && !value.trim();
        const borderStyle = isMissing ? 'border: 2px solid #ef4444; background: #fff5f5;' : '';
        return `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:600; font-size:0.85rem; width:20px; color:${isMissing ? '#ef4444' : 'inherit'};">${letter})</span>
                <input type="text" class="admin-input" style="padding:6px; font-size:0.85rem; flex:1; ${borderStyle}" value="${escapeHtml(value)}" placeholder="Option ${letter}" oninput="updatePreviewQuestionField(${idx}, 'option${letter}', this.value)">
            </div>
        `;
    }).join('');

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="font-weight:700; font-size:0.95rem; color:var(--text-main);">Question #${q.questionNumber}</span>
                <span style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px;">Page ${q.pageNum || 1}</span>
                ${q.ocrUsed ? `<span style="background:#eff6ff; color:#1d4ed8; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-magic"></i> OCR Confidence: High</span>` : ''}
                ${q.isDuplicate ? `<span style="background:#fee2e2; color:#ef4444; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;"><i class="fas fa-exclamation-triangle"></i> Duplicate in DB</span>` : ''}
                <span style="background:#e2e8f0; color:#475569; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px;">${q.language}</span>
            </div>
            <button class="btn btn-sm btn-icon danger" onclick="deleteQuestionFromPreview(${idx})" style="color:#ef4444;"><i class="fas fa-trash"></i></button>
        </div>
        
        <div class="card-warnings" id="card-warnings-${idx}" style="background:#fee2e2; color:#ef4444; border-radius:6px; padding:10px; font-size:0.8rem; font-weight:500; display: ${q.isValid ? 'none' : 'block'};">
            ${(q.validationErrors || []).map(err => `<div>⚠️ ${err}</div>`).join('')}
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:5px;">
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Question Text (English)</label>
                <textarea class="admin-input" style="height:80px; font-size:0.85rem; padding:8px;" oninput="updatePreviewQuestionField(${idx}, 'question', this.value)">${escapeHtml(q.question || '')}</textarea>
            </div>
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Question Text (Hindi - Optional)</label>
                <textarea class="admin-input" style="height:80px; font-size:0.85rem; padding:8px;" oninput="updatePreviewQuestionField(${idx}, 'question_hi', this.value)">${escapeHtml(q.question_hi || '')}</textarea>
            </div>
        </div>

        <div>
            <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Options</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${optionsHtml}
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:5px;">
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Correct Answer</label>
                <select class="admin-input" style="padding:6px; font-size:0.85rem;" onchange="updatePreviewQuestionCorrectIndex(${idx}, this.value)">
                    <option value="A" ${q.answer === 'A' ? 'selected' : ''}>Option A</option>
                    <option value="B" ${q.answer === 'B' ? 'selected' : ''}>Option B</option>
                    <option value="C" ${q.answer === 'C' ? 'selected' : ''}>Option C</option>
                    <option value="D" ${q.answer === 'D' ? 'selected' : ''}>Option D</option>
                    <option value="E" ${q.answer === 'E' ? 'selected' : ''}>Option E</option>
                    <option value="F" ${q.answer === 'F' ? 'selected' : ''}>Option F</option>
                </select>
            </div>
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Difficulty Level</label>
                <select class="admin-input" style="padding:6px; font-size:0.85rem;" onchange="updatePreviewQuestionField(${idx}, 'difficulty', this.value)">
                    <option value="Easy" ${q.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
                    <option value="Medium" ${q.difficulty === 'Medium' || !q.difficulty ? 'selected' : ''}>Medium</option>
                    <option value="Hard" ${q.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
                </select>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:5px;">
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Explanation (English)</label>
                <textarea class="admin-input" style="height:60px; font-size:0.85rem; padding:6px;" oninput="updatePreviewQuestionField(${idx}, 'explanation', this.value)">${escapeHtml(q.explanation || '')}</textarea>
            </div>
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Explanation (Hindi)</label>
                <textarea class="admin-input" style="height:60px; font-size:0.85rem; padding:6px;" oninput="updatePreviewQuestionField(${idx}, 'explanation_hi', this.value)">${escapeHtml(q.explanation_hi || '')}</textarea>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:5px;">
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Subject</label>
                <input type="text" class="admin-input" style="padding:6px; font-size:0.85rem;" value="${escapeHtml(q.subject || 'General')}" oninput="updatePreviewQuestionField(${idx}, 'subject', this.value)">
            </div>
            <div>
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Category</label>
                <input type="text" class="admin-input" style="padding:6px; font-size:0.85rem;" value="${escapeHtml(q.category || 'General')}" oninput="updatePreviewQuestionField(${idx}, 'category', this.value)">
            </div>
        </div>

        ${q.image ? `
            <div style="margin-top:5px;">
                <label style="font-weight:600; font-size:0.8rem; display:block; margin-bottom:4px;">Extracted Image</label>
                <img src="${q.image}" style="max-height:120px; border-radius:6px; border:1px solid #e2e8f0;">
            </div>
        ` : ''}
    `;

    return card;
};

window.updatePreviewQuestionField = function(idx, field, value) {
    const q = window.currentPreviewQuestions[idx];
    if (!q) return;

    if (field.startsWith('option')) {
        const optionLetter = field.replace('option', ''); // A, B, C, D, E, F
        q[field] = value;
        const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
        const optIdx = alphabet.indexOf(optionLetter);
        if (optIdx !== -1) {
            if (!q.options) q.options = ['', '', '', '', '', ''];
            if (!q.options_en) q.options_en = ['', '', '', '', '', ''];
            if (!q.options_hi) q.options_hi = ['', '', '', '', '', ''];
            q.options[optIdx] = value;
            q.options_en[optIdx] = value;
            q.options_hi[optIdx] = value;
        }
    } else {
        q[field] = value;
        if (field === 'question') {
            q.question_en = value;
        }
        if (field === 'question_hi') {
            q.question_hi = value;
        }
    }

    // Run validation checks dynamically to update isValid and warning badge
    const errors = [];
    if (!q.question || q.question.trim().length <= 15) {
        errors.push('Question text is missing, invalid, or too short (length <= 15).');
    }
    const validOpts = q.options.filter(o => o && o.trim() !== '');
    if (validOpts.length < 4) {
        errors.push(`Missing valid options (found only ${validOpts.length}, minimum 4 required).`);
    }
    
    q.isValid = errors.length === 0;
    q.validationErrors = errors;

    window.updateCardValidationUI(idx);
};

window.addBlankQuestionToPreview = function() {
    const nextNum = window.currentPreviewQuestions.length > 0 
        ? Math.max(...window.currentPreviewQuestions.map(pq => pq.questionNumber)) + 1 
        : 1;
        
    window.currentPreviewQuestions.push({
        questionNumber: nextNum,
        question: '',
        question_en: '',
        question_hi: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        optionF: '',
        options: ['', '', '', '', '', ''],
        options_en: ['', '', '', '', '', ''],
        options_hi: ['', '', '', '', '', ''],
        answer: 'A',
        correctAnswer: '',
        correctIndex: 0,
        explanation: '',
        explanation_hi: '',
        language: 'English',
        isValid: false,
        validationErrors: [
            'Question text is missing, invalid, or too short (length <= 15).',
            'Missing valid options (found only 0, minimum 4 required).'
        ]
    });
    window.renderPreviewList();
};

window.deleteQuestionFromPreview = function(idx) {
    if (confirm('Are you sure you want to remove this question from preview?')) {
        window.currentPreviewQuestions.splice(idx, 1);
        window.renderPreviewList();
    }
};

window.updatePreviewQuestionCorrectIndex = function(idx, value) {
    const q = window.currentPreviewQuestions[idx];
    q.answer = value;
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    q.correctIndex = alphabet.indexOf(value);
    q.correctAnswer = q.options[q.correctIndex] || '';
};

window.updateCardValidationUI = function(idx) {
    const q = window.currentPreviewQuestions[idx];
    const card = document.getElementById(`q-card-${idx}`);
    const warningsEl = document.getElementById(`card-warnings-${idx}`);
    const warningBadge = document.getElementById('preview-warning-badge');
    const warningCountEl = document.getElementById('preview-warning-count');

    if (!card) return;

    if (q.isValid) {
        card.style.border = '1px solid var(--border-color)';
        if (warningsEl) warningsEl.style.display = 'none';
    } else {
        card.style.border = '2px solid #ef4444';
        if (warningsEl) {
            warningsEl.style.display = 'block';
            warningsEl.innerHTML = (q.validationErrors || []).map(err => `<div>⚠️ ${err}</div>`).join('');
        }
    }

    // Update global warning count badge
    let warningCount = 0;
    window.currentPreviewQuestions.forEach(pq => {
        if (!pq.isValid) warningCount++;
    });

    if (warningCount > 0) {
        warningBadge.style.display = 'inline-block';
        warningCountEl.textContent = warningCount;
    } else {
        warningBadge.style.display = 'none';
    }
};

window.confirmPreviewImport = async function() {
    const invalidCount = window.currentPreviewQuestions.filter(q => !q.isValid).length;
    if (invalidCount > 0) {
        if (!confirm(`⚠️ You have ${invalidCount} questions with validation warnings (missing text or too few options). Are you sure you want to proceed?`)) {
            return;
        }
    }

    const btn = document.getElementById('preview-import-btn');
    const replaceDuplicates = document.getElementById('preview-replace-duplicates')?.checked || false;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        await window.confirmPreviewImportCallback(window.currentPreviewQuestions, replaceDuplicates);
        closeModal();
    } catch (err) {
        alert('Import failed: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save & Import Questions';
        }
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
