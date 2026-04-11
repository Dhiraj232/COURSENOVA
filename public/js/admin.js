/**
 * COURSENOVA - Admin Panel Logic
 */

const API_BASE = '/api/admin';

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initNavigation();
    loadView('dashboard');
});

function checkAdminAuth() {
    const userStr = localStorage.getItem('coursenovaUser') || localStorage.getItem('coursenova_user');
    const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');

    if (!token || !userStr) {
        window.location.href = 'signup.html';
        return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        alert('Access denied. You do not have administrator privileges.');
        window.location.href = 'dashboard.html';
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
}

async function loadView(view) {
    const contentArea = document.getElementById('content-area');
    const title = document.getElementById('view-title');

    contentArea.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching ${view} data...</p></div>`;

    try {
        const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        switch (view) {
            case 'dashboard':
                title.textContent = 'Dashboard Overview';
                const statsRes = await fetch(`${API_BASE}/stats`, { headers });
                const statsData = await statsRes.json();
                renderDashboard(statsData.stats);
                break;

            case 'courses':
                title.textContent = 'Course Management';
                const coursesRes = await fetch(`${API_BASE}/courses`, { headers });
                const coursesData = await coursesRes.json();
                renderCourses(coursesData.courses);
                break;

            case 'users':
                title.textContent = 'User Management';
                const usersRes = await fetch(`${API_BASE}/users`, { headers });
                const usersData = await usersRes.json();
                renderUsers(usersData.users);
                break;

            case 'certificates':
                title.textContent = 'Certificates Monitoring';
                const certRes = await fetch(`${API_BASE}/certificates`, { headers });
                const certData = await certRes.json();
                renderCertificates(certData.certs);
                break;

            case 'questions':
                title.textContent = 'Question Management';
                renderQuestionsUI();
                break;

            case 'marketplace':
                title.textContent = 'Marketplace Overview';
                const mktRes = await fetch(`${API_BASE}/marketplace-stats`, { headers });
                const mktData = await mktRes.json();
                renderMarketplace(mktData.stats);
                break;
        }
    } catch (err) {
        contentArea.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${err.message}</p></div>`;
    }
}

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
                    <span class="stat-label">Certs Generated</span>
                </div>
            </div>
        </div>
        
        <div class="admin-card">
            <div class="card-header">
                <h3>System Snapshot</h3>
            </div>
            <div style="padding: 40px; text-align: center;">
                <canvas id="statsChart" style="max-height: 300px;"></canvas>
            </div>
        </div>
    `;

    // Initialize Chart
    const ctx = document.getElementById('statsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Users', 'Courses', 'Tests', 'Certs'],
            datasets: [{
                label: 'Global Stats',
                data: [stats.totalUsers, stats.totalCourses, stats.totalTests, stats.totalCertificates],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#a855f7'],
                borderRadius: 8
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
                        <th>Level</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(c => `
                        <tr>
                            <td><strong>${c.title}</strong></td>
                            <td>${c.level}</td>
                            <td>₹${c.price || 0}</td>
                            <td><span class="admin-badge">${c.isFree ? 'Free' : 'Paid'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="editCourse('${c._id}')">Edit</button>
                                <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteCourse('${c._id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderUsers(users) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>Registered Students</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="width:32px; height:32px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; font-weight:700;">${u.name ? u.name[0] : 'U'}</div>
                                    ${u.name}
                                </div>
                            </td>
                            <td>${u.email}</td>
                            <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                            <td><span class="admin-badge">${u.role}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="viewUserProgress('${u._id}')">View Progress</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCertificates(certs) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="admin-card">
            <div class="card-header">
                <h3>Generated Certificates</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Certificate ID</th>
                        <th>Issue Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${certs.map(c => `
                        <tr>
                            <td>${c.userId ? c.userId.name : 'Unknown'}</td>
                            <td>${c.courseId}</td>
                            <td><code>${c.certId}</code></td>
                            <td>${new Date(c.updatedAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderQuestionsUI() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="grid-column: span 2;">
                <div class="stat-info" style="width: 100%;">
                    <h3>Bulk MCQ Upload</h3>
                    <p style="margin-bottom: 20px; color: var(--text-muted);">Paste JSON array of questions to update the database.</p>
                    <textarea id="json-upload" style="width:100%; height:200px; padding:15px; border-radius:12px; border:1px solid var(--border); font-family:monospace; margin-bottom:15px;" placeholder='[ { "title": "...", "options": [...], "answer": "..." } ]'></textarea>
                    <button class="btn btn-primary" onclick="handleBulkUpload()">Upload JSON</button>
                </div>
            </div>
        </div>
    `;
}

async function handleBulkUpload() {
    const jsonStr = document.getElementById('json-upload').value;
    try {
        const data = JSON.parse(jsonStr);
        const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
        const res = await fetch(`${API_BASE}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.ok) {
            alert(`Success! Uploaded ${result.count || 1} questions.`);
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (e) {
        alert('Invalid JSON format. Please check your data.');
    }
}
function renderMarketplace(stats) {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-book"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalListings}</span>
                    <span class="stat-label">Total Listings</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
                <div class="stat-info">
                    <span class="stat-value">${stats.totalSold}</span>
                    <span class="stat-label">Books Sold</span>
                </div>
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <div class="stat-icon orange"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="stat-info">
                    <span class="stat-value">₹${stats.totalCommissions}</span>
                    <span class="stat-label">Total Commissions Earned</span>
                </div>
            </div>
        </div>
        
        <div class="admin-card">
            <div class="card-header">
                <h3>Marketplace Performance</h3>
            </div>
            <div style="padding: 30px;">
                <p>Commissions are automatically calculated (5%) when students mark their books as <strong>Sold</strong>.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border);">
                    <h4 style="margin-bottom: 10px;">Platform Insights</h4>
                    <ul>
                        <li>Conversion Rate: <strong>${stats.totalListings ? ((stats.totalSold / stats.totalListings) * 100).toFixed(1) : 0}%</strong></li>
                        <li>Average Commission per Sale: <strong>₹${stats.totalSold ? (stats.totalCommissions / stats.totalSold).toFixed(2) : 0}</strong></li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}
