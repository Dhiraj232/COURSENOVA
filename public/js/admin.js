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
                title.textContent = 'Broadcast Announcements';
                const nData = await fetchData(`${API_BASE}/notifications`);
                renderNotificationsAdmin(nData.announcements || []);
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
                        <button class="btn btn-primary" style="width:100%;" onclick="showPdfUploadModal()">Import from PDF</button>
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
    `;

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
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4>Final Exam Quiz</h4>
                        <button type="button" class="btn btn-sm btn-primary" onclick="addQuizRow()">+ Add Question</button>
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

async function handleCourseSubmit(id) {
    const payload = {
        title: document.getElementById('courseTitle').value,
        slug: document.getElementById('courseSlug').value,
        price: Number(document.getElementById('coursePrice').value),
        level: document.getElementById('courseLevel').value,
        category: document.getElementById('courseCategory').value,
        icon: document.getElementById('courseIcon').value,
        description: document.getElementById('courseDescription').value,
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
        const data = await fetchData(`${API_BASE}/mock-tests`);
        const pack = data.packs.find(p => p._id === id);
        if (pack) renderMockTestModal('Edit Mock Test Pack', pack);
    } catch (err) {
        alert('Failed to load pack details');
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
    const isHindi = lang === 'hi';
    const status = row.querySelector(isHindi ? '.pdf-status-hi' : '.pdf-status-en');
    const btn    = row.querySelector(isHindi ? '.mt-t-hi-btn'  : '.mt-t-en-btn');
    const countBadge = row.querySelector('.q-count-badge');
    const qIdsInput  = row.querySelector('.mt-t-qids');

    const formData = new FormData();
    formData.append('pdf', file);

    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parsing PDF...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/generate-questions-from-pdf?lang=${lang}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            status.innerHTML = `<span style="color:var(--danger)">Error: ${res.status === 404 ? 'Server needs restart' : res.statusText}</span>`;
            btn.disabled = false;
            return;
        }

        const data = await res.json();
        if (!data.ok) {
            status.innerHTML = `<span style="color:var(--danger)">${data.message}</span>`;
            btn.disabled = false;
            return;
        }

        // ── HINDI: Merge into existing questions ──
        if (isHindi) {
            const existingIds = qIdsInput.value.split(',').map(s => s.trim()).filter(Boolean);
            if (existingIds.length === 0) {
                status.innerHTML = `<span style="color:var(--danger)">⚠️ Upload English PDF first, then Hindi.</span>`;
                btn.disabled = false;
                return;
            }
            if (data.questions.length !== existingIds.length) {
                status.innerHTML = `<span style="color:#d97706;">⚠️ Mismatch: ${data.questions.length} Hindi Qs vs ${existingIds.length} English Qs. Proceeding anyway...</span>`;
            }
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Hindi to questions...';

            const pairPayload = data.questions.map((q, idx) => ({
                _id: existingIds[idx] || null,
                question_hi: q.question_hi,
                options_hi: q.options_hi
            })).filter(p => p._id);

            const mergeRes = await fetch(`${API_BASE}/questions/add-hindi`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(pairPayload)
            });
            const mergeData = await mergeRes.json();
            if (mergeData.ok) {
                status.innerHTML = `<span style="color:#d97706; font-weight:600;">✅ Hindi added to ${mergeData.updated} questions!</span>`;
                btn.innerHTML = '<i class="fas fa-check"></i> Hindi Updated';
                btn.disabled = false;
            } else {
                status.innerHTML = `<span style="color:var(--danger)">Hindi save failed: ${mergeData.message}</span>`;
                btn.disabled = false;
            }
            return;
        }

        // ── ENGLISH: Create new questions ──
        status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving questions to DB...';
        const saveRes = await fetch(`${API_BASE}/questions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data.questions)
        });
        const saveData = await saveRes.json();
        if (saveData.ok) {
            const newQIds = saveData.questions.map(q => q._id).join(', ');
            // IMPORTANT: Completely replace the old IDs with new ones from the PDF
            qIdsInput.value = newQIds; 
            countBadge.textContent = saveData.questions.length;
            status.innerHTML = `<span style="color:#6366f1; font-weight:600;">✅ ${saveData.questions.length} Questions imported! (Old ones removed)</span>`;
            btn.innerHTML = '<i class="fas fa-check"></i> English Uploaded';
            btn.disabled = false;
        } else {
            status.innerHTML = `<span style="color:var(--danger)">Save failed: ${saveData.message || 'DB error'}</span>`;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> Retry';
        }
    } catch (e) {
        status.innerHTML = `<span style="color:var(--danger)">Upload failed: ${e.message}</span>`;
        btn.disabled = false;
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
    const res = await fetch(`${API_BASE}/courses`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const course = data.courses.find(c => c._id === id);
    if (course) renderCourseModal('Edit Course', course);
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
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:10px;">
                    Make sure the PDF has questions in a standard format (e.g., 1. Question... A) Option...).
                </p>
            </div>
            <div id="pdf-status" style="margin-top:15px; font-size:0.9rem;"></div>
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="pdfUploadBtn" onclick="handlePdfUpload()">Extract & Preview</button>
            </div>
        </div>
    `;
    modalContainer.classList.add('active');
}

async function handlePdfUpload() {
    const fileInp = document.getElementById('pdfFile');
    const status = document.getElementById('pdf-status');
    const btn = document.getElementById('pdfUploadBtn');

    if (!fileInp.files[0]) return alert('Please select a file');

    const formData = new FormData();
    formData.append('pdf', fileInp.files[0]);

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    status.innerHTML = 'Extracting text and parsing questions...';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/generate-questions-from-pdf`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {
            status.innerHTML = `<span style="color:var(--danger)">Error: ${res.status === 404 ? 'Server needs restart (Route not found)' : res.statusText}</span>`;
            btn.disabled = false;
            return;
        }

        const data = await res.json();
        
        if (data.ok) {
            status.innerHTML = `<span style="color:var(--success)">Successfully parsed ${data.count} questions!</span>`;
            // Show preview of parsed questions in the bulk upload area
            setTimeout(() => {
                showBulkUploadModal();
                document.getElementById('bulkJson').value = JSON.stringify(data.questions, null, 2);
                alert(`Found ${data.count} questions. Please review them in the JSON box before final upload.`);
            }, 1000);
        } else {
            status.innerHTML = `<span style="color:var(--danger)">Error: ${data.message}</span>`;
            btn.disabled = false;
            btn.textContent = 'Try Again';
        }
    } catch (e) {
        status.innerHTML = `<span style="color:var(--danger)">Failed to process PDF</span>`;
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
        const res = await fetch(`${API_BASE}/slides`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            const slide = data.slides.find(s => s._id === id);
            if (slide) {
                renderSlideModal('Edit Slide Banner', slide);
            } else {
                alert('Slide not found');
            }
        } else {
            alert('Failed to load slides info');
        }
    } catch (err) {
        alert('Error loading slide details');
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
                    <input type="text" id="slideLink" class="admin-input" value="${slide?.link || ''}" placeholder="e.g. /premium-courses.html or https://www.google.com">
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
