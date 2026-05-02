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
                const lbData = await fetchData(`${API_BASE}/daily-challenge/results`);
                renderLeaderboard(lbData.results);
                break;

            case 'audit-logs':
                title.textContent = 'Audit Trail';
                const auditData = await fetchData(`${API_BASE}/audit-logs`);
                renderAuditLogs(auditData.logs);
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
                        <input type="text" id="q-search" class="admin-input" placeholder="Search questions...">
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
            <div style="padding:40px; text-align:center; color:var(--text-muted);">Search for questions to display results</div>
        </div>
    `;
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
    const qIds = t.questions ? (Array.isArray(t.questions) && typeof t.questions[0] === 'object' ? t.questions.map(q => q._id).join(', ') : t.questions.join(', ')) : '';

    return `
        <div class="item-row mt-row" data-index="${i}">
            <div class="item-info">
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px; margin-bottom:8px;">
                    <input type="text" placeholder="Test Title" class="admin-input mt-t-title" value="${t.testTitle || ''}" style="padding:8px;">
                    <input type="number" placeholder="Duration (min)" class="admin-input mt-t-dur" value="${t.durationMinutes || 60}" style="padding:8px;">
                    <input type="text" placeholder="ID (slug)" class="admin-input mt-t-id" value="${t.testId || ''}" style="padding:8px;">
                </div>
                <div style="display:flex; align-items:center; gap:15px; background: var(--bg-light); padding:10px; border-radius:8px; border: 1px dashed var(--border);">
                    <div style="flex:1;">
                        <span style="font-size:0.8rem; font-weight:600;"><i class="fas fa-list-ol"></i> <span class="q-count-badge">${qCount}</span> Questions Linked</span>
                        <input type="hidden" class="mt-t-qids" value="${qIds}">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <input type="file" class="mt-t-pdf-input" accept=".pdf" style="display:none;" onchange="handlePdfToTest(this, ${i})">
                        <button type="button" class="btn btn-sm btn-outline" onclick="this.previousElementSibling.click()">
                            <i class="fas fa-file-pdf"></i> ${qCount > 0 ? 'Replace PDF' : 'Upload PDF'}
                        </button>
                    </div>
                </div>
                <div class="pdf-status-msg" style="font-size:0.7rem; margin-top:5px; color:var(--text-muted);"></div>
            </div>
            <button type="button" class="btn-icon danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-trash"></i></button>
        </div>
    `;
}

async function handlePdfToTest(input, index) {
    const file = input.files[0];
    if (!file) return;

    const row = input.closest('.mt-row');
    const status = row.querySelector('.pdf-status-msg');
    const countBadge = row.querySelector('.q-count-badge');
    const qIdsInput = row.querySelector('.mt-t-qids');
    const btn = row.querySelector('.btn');

    const formData = new FormData();
    formData.append('pdf', file);

    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parsing PDF...';
    btn.disabled = true;

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
            // Now we need to save these questions to the DB first to get IDs
            status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Questions...';
            const saveRes = await fetch(`${API_BASE}/questions`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data.questions)
            });
            const saveData = await saveRes.json();

            if (saveData.ok) {
                const newQIds = saveData.questions.map(q => q._id).join(', ');
                qIdsInput.value = newQIds;
                countBadge.textContent = saveData.questions.length;
                status.innerHTML = `<span style="color:var(--success)">Done! ${data.count} questions added & linked.</span>`;
                btn.innerHTML = '<i class="fas fa-check"></i> PDF Uploaded';
            }
        } else {
            status.innerHTML = `<span style="color:var(--danger)">Error: ${data.message}</span>`;
            btn.disabled = false;
        }
    } catch (e) {
        status.innerHTML = `<span style="color:var(--danger)">Upload failed</span>`;
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
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header"><h3>User Directory</h3></div>
            <table class="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong>${u.name}</strong></td>
                            <td>${u.email}</td>
                            <td><span class="admin-badge">${u.role || 'Guest'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="toggleUserBlock('${u._id}', '${u.role}')">${u.role ? 'Block' : 'Unblock'}</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPayments(payments) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header"><h3>Transaction History</h3></div>
            <table class="admin-table">
                <thead><tr><th>User</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td>${p.userId?.name || 'Unknown'}<br><small>${p.userId?.email || ''}</small></td>
                            <td>${p.itemType} (${p.itemId})</td>
                            <td>₹${p.amount}</td>
                            <td><span class="admin-badge ${p.status}">${p.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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

// Additional functions from previous version like editCourse, deleteCourse, etc.
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
