// public/js/utils.js

const API_URL = 'http://localhost:3000/api';

// --- Auth Utils ---
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
}

function isLoggedIn() {
    return !!getToken();
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// --- UI Navigation Update ---
function updateNavbar() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const currentPath = window.location.pathname;
    let html = `<li><a href="/" class="${currentPath === '/' ? 'active' : ''}">Home</a></li>`;

    if (isLoggedIn()) {
        html += `<li><a href="/my-courses.html" class="${currentPath.includes('my-courses') ? 'active' : ''}">My Courses</a></li>`;

        if (isAdmin()) {
            html += `<li><a href="/admin.html" class="${currentPath.includes('admin') ? 'active' : ''}">Admin Dashboard</a></li>`;
        }

        html += `<li><a href="#" id="logout-btn">Logout (${getUser().name})</a></li>`;
    } else {
        html += `<li><a href="/login.html" class="${currentPath.includes('login') ? 'active' : ''}">Login</a></li>`;
        html += `<li><a href="/signup.html" class="${currentPath.includes('signup') ? 'active' : ''}">Sign Up</a></li>`;
    }

    navLinks.innerHTML = html;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// --- Generic Fetch ---
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    const token = getToken();

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData && body) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = response.headers.get('content-type')?.includes('application/json')
            ? await response.json()
            : await response.blob();

        if (!response.ok) {
            throw new Error(data.message || 'API Error');
        }

        return { data, ok: true, isBlob: response.headers.get('content-type')?.includes('application/pdf') };
    } catch (error) {
        return { error: error.message, ok: false };
    }
}

// Global Init
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});
