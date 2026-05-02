/**
 * ==================== COURSENOVA PROFILE DASHBOARD LOGIC ====================
 * 
 * This file handles fetching profile information, updating details,
 * switching between dashboard tabs, and rendering analytics and charts.
 */

document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    initProfileTabs();
    loadProfileData();
    loadUserCourses();
    loadPaymentHistory();
    loadCertificates();
    initAnalytics();
});

/**
 * Check if the user is logged in.
 */
function checkAuthentication() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    const user = typeof getAuthUser === 'function' ? getAuthUser() : JSON.parse(localStorage.getItem('user') || localStorage.getItem('coursenovaUser') || 'null');

    if (!token || !user) {
        console.warn('Authentication token not found. Redirecting to login...');
        window.location.href = 'signup.html?redirect=profile.html';
        return false;
    }
    return true;
}

/**
 * Handle switching sections via sidebar tabs.
 */
function initProfileTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.profile-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Toggle Edit Mode for User Details
 */
let isEditMode = false;
function toggleProfileEdit() {
    isEditMode = !isEditMode;
    const form = document.getElementById('profileForm');
    const inputs = form.querySelectorAll('input:not(#profileEmail):not(#profileJoinDate)');
    const actions = document.getElementById('editActions');
    const editBtn = document.getElementById('toggleEdit');

    inputs.forEach(input => input.disabled = !isEditMode);
    actions.style.display = isEditMode ? 'flex' : 'none';
    editBtn.style.display = isEditMode ? 'none' : 'block';
}

/**
 * Load User Details from Backend
 */
async function loadProfileData() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));

    try {
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.ok) {
            const user = data.profile;
            // Update Headers & Profile Card
            document.getElementById('userNameTitle').innerText = user.name;
            document.getElementById('userEmailTitle').innerText = user.email;
            document.getElementById('profilePicLarge').src = user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`;

            // Update Form Fields
            document.getElementById('profileName').value = user.name;
            document.getElementById('profileEmail').value = user.email;
            document.getElementById('profileCollege').value = user.collegeName || '';
            document.getElementById('profileDept').value = user.department || '';
            document.getElementById('profileYear').value = user.year || '';

            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Jan 2025';
            document.getElementById('profileJoinDate').value = joinDate;
            document.getElementById('joinedDateDisplay').innerText = joinDate;
        }
    } catch (err) { console.error('Profile fetch error:', err); }
}

/**
 * Load Enrolled Courses
 */
async function loadUserCourses() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    const container = document.getElementById('userCoursesContainer');

    try {
        const response = await fetch('/api/user/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.ok && data.courses.length > 0) {
            container.innerHTML = data.courses.map(course => `
                <div class="course-item-wide">
                    <div class="course-icon-box">${course.icon || '📚'}</div>
                    <div class="course-info-box">
                        <h4>${course.title}</h4>
                        <p>Instructor: ${course.instructor}</p>
                        <div class="progress-info">
                            <span style="font-size: 0.8rem; font-weight: 700; color: #6366f1;">${course.progress}% Completed</span>
                            <div class="progress-bar-bg" style="height: 6px; margin-top: 5px;">
                                <div class="progress-bar-fill" style="width: ${course.progress}%; background: linear-gradient(90deg, #6366f1, #a855f7);"></div>
                            </div>
                        </div>
                    </div>
                    <div class="course-action">
                        <button class="btn-continue" onclick="window.location.href='course-content.html?course=${course.id}'">
                            Continue <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="empty-state">No courses yet. <a href="courses.html">Browse here</a></div>`;
        }
    } catch (err) { console.error('Courses fetch error:', err); }
}

/**
 * Load Payment History
 */
async function loadPaymentHistory() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    const tableBody = document.getElementById('paymentHistoryBody');

    try {
        const response = await fetch('/api/user/payments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.ok && data.payments.length > 0) {
            tableBody.innerHTML = data.payments.map(p => `
                <tr>
                    <td>${p.courseName}</td>
                    <td>₹${p.amount}</td>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-success">Success</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: grey;">No transactions found.</td></tr>`;
        }
    } catch (err) { console.error('Payments fetch error:', err); }
}

/**
 * Load Certificates
 */
async function loadCertificates() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    const container = document.getElementById('certificatesContainer');

    try {
        const response = await fetch('/api/user/certificates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.ok && data.certificates.length > 0) {
            container.innerHTML = data.certificates.map(c => `
                <div class="course-item-wide">
                    <div class="course-icon-box" style="background: rgba(16, 185, 129, 0.1); color: #10b981"><i class="fas fa-award"></i></div>
                    <div class="course-info-box">
                        <h4>${c.courseId}</h4>
                        <p>Certificate ID: <span style="color: #6366f1; font-weight:700;">${c.certId}</span></p>
                        <p>Issued on : ${new Date(c.earnedAt).toLocaleDateString()}</p>
                    </div>
                    <div class="course-action">
                        <button class="btn-save" style="background: #10b981" onclick="downloadCertificate('${c.courseId}', '${c.certId}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<p style="text-align: center; color: grey;">Pass a final test to earn certificates.</p>`;
        }
    } catch (err) { console.error('Certs fetch error:', err); }
}

/**
 * Initialize Analytics & Charts
 */
async function initAnalytics() {
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));

    try {
        const response = await fetch('/api/analytics/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.ok) {
            const { stats, courses, weeklyActivity } = data;

            // Stats update
            document.getElementById('statTotalCourses').innerText = stats.totalCourses;
            document.getElementById('statCompletedCourses').innerText = stats.completedCourses;
            document.getElementById('statCerts').innerText = stats.certificates;
            document.getElementById('statScore').innerText = `${stats.avgScore}%`;

            // Charts
            const radarCtx = document.getElementById('progressRadar');
            if (radarCtx && courses.length > 0) {
                new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: courses.slice(0, 5).map(c => c.title.substring(0, 8)),
                        datasets: [{
                            label: 'Progress %',
                            data: courses.slice(0, 5).map(c => c.progress),
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            borderColor: '#6366f1',
                            borderWidth: 2
                        }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
                });
            }

            const studyCtx = document.getElementById('studyTimeChart');
            if (studyCtx) {
                new Chart(studyCtx, {
                    type: 'line',
                    data: {
                        labels: weeklyActivity.map(i => i.day),
                        datasets: [{
                            label: 'Minutes Spent',
                            data: weeklyActivity.map(i => i.minutes),
                            borderColor: '#a855f7',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            }
        }
    } catch (err) { console.error('Analytics fetch error:', err); }
}

/**
 * Handle Profile Update Submission
 */
document.getElementById('profileForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));

    const updateData = {
        fullName: document.getElementById('profileName').value,
        collegeName: document.getElementById('profileCollege').value,
        department: document.getElementById('profileDept').value,
        year: document.getElementById('profileYear').value
    };

    try {
        const response = await fetch('/api/user/profile/update', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        const data = await response.json();

        if (data.ok) {
            alert('Profile updated successfully!');
            toggleProfileEdit();
            loadProfileData(); // Reload to refresh headers
        } else {
            alert('Update failed: ' + data.message);
        }
    } catch (err) { alert('An error occurred during update.'); }
});

/**
 * Handle Avatar Upload (Base64)
 */
document.getElementById('avatarUploader').addEventListener('change', async function (e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            // Update preview
            document.getElementById('profilePicLarge').src = base64;

            // Sync with DB
            try {
                const res = await fetch('/api/user/profile/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ picture: base64 })
                });
                const data = await res.json();
                if (data.ok) showToast('Profile picture updated! 📸');
                else showToast('Sync failed: ' + data.message, 'error');
            } catch (err) { console.error('Upload Error:', err); }
        };
        reader.readAsDataURL(file);
    }
});

function showToast(msg, type = 'success') {
    // Basic alert fallback if not implemented
    console.log(`[${type}] ${msg}`);
    if (type === 'error') alert(msg);
}

function downloadCertificate(cId, certId) {
    window.location.href = `/api/certificates/generate/${certId}`;
}
