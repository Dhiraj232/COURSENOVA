// API base is auto-detected by config.js (localhost in dev, Render in prod)
const API = window.RENVOX_API || 'https://renvox-ai.onrender.com';
const token = localStorage.getItem('renvoxToken') || localStorage.getItem('renvox_token') || '';

let courses = [];

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCourses();
});

async function fetchCourses() {
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Use all-courses to get everything (Free + Premium)
        const res = await fetch(`${API}/api/premium/courses`, { headers });
        const data = await res.json();
        
        if (data.ok && data.courses) {
            courses = data.courses;
            const cnt1 = document.getElementById('premCourseCount');
            if (cnt1) cnt1.textContent = `(${courses.length})`;
            const cnt2 = document.getElementById('coursesCount');
            if (cnt2) cnt2.textContent = courses.length;
            renderGrid(courses);
        } else {
            showToast('Failed to load courses.', 'toast-error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error loading courses.', 'toast-error');
    }
}

function renderGrid(courses) {
    const grid = document.getElementById('premGrid');
    if (!grid) return;
    
    if (!courses.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8">No courses available right now.</div>';
        return;
    }

    grid.innerHTML = '';
    
    courses.forEach(c => {
        const id = c._id;
        const enrolled = c.enrolled;
        const prog = c.progress ? c.progress.progressPercent || 0 : 0;
        const completed = c.progress && c.progress.isCompleted;
        const isFree = c.isFree === true || c.price === 0;

        const card = document.createElement('div');
        card.className = 'prem-card';
        
        // Premium courses are locked if not enrolled; Free courses are always open to view
        const lockOverlay = (!enrolled && !isFree) ? `<div class="prem-lock-overlay"><i class="fas fa-lock"></i></div>` : '';
        const highlights = c.highlights && c.highlights.length ? `<ul class="prem-highlights">
            ${c.highlights.slice(0,3).map(h => `<li>${h}</li>`).join('')}
        </ul>` : '';
        const progressBar = enrolled && !completed ? `
            <div class="prem-progress-label">Progress: ${prog}%</div>
            <div class="prem-progress-bar">
                <div class="prem-progress-fill" style="width:${prog}%"></div>
            </div>` : '';

        card.innerHTML = `
            <div class="prem-card-top">
                ${lockOverlay}
                <div class="prem-card-icon">${c.icon || '📚'}</div>
                <div class="prem-card-badge" style="background:${isFree ? '#10b981' : '#7c3aed'}">
                    ${isFree ? 'FREE' : 'Premium'}
                </div>
                <h3>${c.title}</h3>
                <p>${c.description || 'Unlock this course to accelerate your journey.'}</p>
                <div class="prem-card-meta">
                    <span class="prem-meta-item"><i class="fas fa-clock"></i> ${c.duration || 'Flexible'}</span>
                    <span class="prem-meta-item"><i class="fas fa-signal"></i> ${c.level || 'Beginner'}</span>
                </div>
                ${highlights}
                ${progressBar}
            </div>
            <div class="prem-card-footer">
                ${!enrolled ? `
                <div class="prem-price">
                    <span class="prem-price-amount">${isFree ? 'FREE' : '₹' + Number(c.price).toLocaleString('en-IN')}</span>
                    <span class="prem-price-sub">${isFree ? 'Join Now' : 'Lifetime Access'}</span>
                </div>` : `<div><span style="color:#10b981;font-size:0.85rem;font-weight:700">✅ Enrolled</span></div>`}
                <div class="btn-container"></div>
            </div>
        `;

        const btnContainer = card.querySelector('.btn-container');
        if (completed) {
            const btn = document.createElement('button');
            btn.className = 'btn-continue';
            btn.innerHTML = '🏆 View Course';
            btn.onclick = () => window.location.href = `premium-course-player.html?course=${id}`;
            btnContainer.appendChild(btn);
        } else if (enrolled) {
            const btn = document.createElement('button');
            btn.className = 'btn-continue';
            btn.innerHTML = `<i class="fas fa-play"></i> Continue (${prog}%)`;
            btn.onclick = () => window.location.href = `premium-course-player.html?course=${id}`;
            btnContainer.appendChild(btn);
        } else if (isFree) {
            const btn = document.createElement('a');
            btn.className = 'btn-buy';
            btn.style.background = '#10b981';
            btn.href = `premium-course-player.html?course=${id}`;
            btn.innerHTML = `<i class="fas fa-play-circle"></i> Start for FREE`;
            btnContainer.appendChild(btn);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn-buy';
            btn.innerHTML = `<i class="fas fa-crown"></i> Buy Now — ₹${Number(c.price).toLocaleString('en-IN')}`;
            btn.onclick = () => window.buyCourse(id, c.title, c.price);
            btnContainer.appendChild(btn);
        }

        grid.appendChild(card);
    });
}

window.enrollFree = async function(id, title) {
    if (!token) {
        showToast('Please login to enroll. Redirecting...', 'toast-error');
        setTimeout(() => window.location.href = 'signup.html?redirect=certificates.html', 2000);
        return;
    }

    try {
        showToast(`Enrolling you in ${title}...`, 'toast-success');
        const res = await fetch(`${API}/api/enrollments/enroll-free`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ courseId: id })
        });
        const data = await res.json();

        if (data.ok) {
            showToast(`Successfully enrolled! Redirecting to player...`, 'toast-success');
            setTimeout(() => {
                window.location.href = `premium-course-player.html?course=${id}`;
            }, 1500);
        } else {
            throw new Error(data.message || 'Enrollment failed');
        }
    } catch (err) {
        console.error(err);
        showToast(err.message, 'toast-error');
    }
};

window.buyCourse = async function(courseId, title, price) {
    if (!token) {
        showToast('Please login to purchase premium courses', 'toast-error');
        setTimeout(() => window.location.href = 'signup.html', 1500);
        return;
    }

    // Disable all Buy buttons to prevent double-click
    document.querySelectorAll('.btn-buy').forEach(b => {
        b.disabled = true;
        b._originalText = b.innerHTML;
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    });

    try {
        console.log(`[buyCourse] Initializing purchase for courseId: ${courseId} (${title})`);
        showToast('Initializing secure checkout...', 'toast-success');

        // 1. Create Order on backend (server validates, creates CF order)
        const orderRes = await fetch(`${API}/api/cashfree/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ courseId })
        });
        const orderData = await orderRes.json();

        if (!orderData.ok) {
            // Handle "already enrolled" gracefully
            if (orderData.message && orderData.message.toLowerCase().includes('already')) {
                showToast('You are already enrolled in this course! Redirecting...', 'toast-success');
                setTimeout(() => window.location.href = `premium-course-player.html?course=${courseId}`, 1500);
                return;
            }
            throw new Error(orderData.message || 'Failed to create order. Please try again.');
        }

        // 2. Determine correct mode (sandbox/production)
        const configRes = await fetch(`${API}/api/cashfree/config`);
        const configData = await configRes.json();
        const sdkMode = configData.mode || 'sandbox';

        // 3. Verify Cashfree JS SDK loaded
        if (typeof Cashfree === 'undefined') {
            throw new Error('Payment gateway script not loaded. Disable adblockers or refresh.');
        }

        console.log(`[buyCourse] Launching Cashfree in ${sdkMode} mode`);
        const cashfree = Cashfree({ mode: sdkMode });

        // 3. Redirect to Cashfree Hosted Checkout
        // On completion Cashfree calls our return_url:
        // /premium-course-player.html?course=<id>&payment=verify&order_id=<id>
        await cashfree.checkout({ paymentSessionId: orderData.payment_session_id });

    } catch (err) {
        console.error('[buyCourse] Error:', err);
        showToast(err.message || 'Error launching checkout. Please try again.', 'toast-error');
        // Re-enable buy buttons on error
        document.querySelectorAll('.btn-buy').forEach(b => {
            b.disabled = false;
            if (b._originalText) b.innerHTML = b._originalText;
        });
    }
};

// The verifyPayment function has been removed. Cashfree checkout redirects the user
// to premium-course-player.html?payment=verify&order_id=... where we will handle it.

function showToast(msg, typeClass = 'toast-success') {
    const toast = document.getElementById('premToast');
    const title = document.getElementById('premToastTitle');
    const desc  = document.getElementById('premToastMsg');
    
    if (!toast) return;
    
    toast.className = `prem-toast ${typeClass} active`;
    if (title) title.textContent = typeClass === 'toast-success' ? 'Success' : 'Notice';
    if (desc) desc.textContent = msg;
    
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('active'), 4000);
}
