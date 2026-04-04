const API = '';
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
        setTimeout(() => window.location.href = 'signup.html?redirect=premium-courses.html', 2000);
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

window.buyCourse = async function(id, title, price) {
    if (!token) {
        showToast('Please login to purchase premium courses', 'toast-error');
        setTimeout(() => window.location.href = 'signup.html', 1500);
        return;
    }

    try {
        showToast('Initializing secure checkout...', 'toast-success');
        
        // 1. Create Order
        const orderRes = await fetch(`${API}/api/premium/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ courseId: id })
        });
        const orderData = await orderRes.json();

        if (!orderData.ok) {
            if (orderData.message && orderData.message.toLowerCase().includes('already')) {
                showToast('You are already enrolled in this course!', 'toast-success');
                fetchCourses();
                return;
            }
            throw new Error(orderData.message || 'Failed to create order');
        }

        // 2. Launch Razorpay
        if (typeof Razorpay === 'undefined') {
            throw new Error('Payment gateway not loaded. Please disable adblockers or refresh.');
        }

        const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'RENVOX AI',
            description: `Lifetime Access: ${title}`,
            order_id: orderData.orderId,
            handler: async function (response) {
                await verifyPayment(response, id, title);
            },
            theme: { color: '#7c3aed' },
            modal: {
                ondismiss: () => showToast('Payment checkout cancelled', 'toast-error')
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error(err);
        showToast(err.message || 'Error launching checkout', 'toast-error');
    }
};

async function verifyPayment(response, courseId, title) {
    showToast('Verifying payment...', 'toast-success');
    try {
        const verifyRes = await fetch(`${API}/api/premium/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: courseId
            })
        });
        const data = await verifyRes.json();
        
        if (data.ok) {
            for(let i=0; i<30; i++) {
                const conf = document.createElement('div');
                conf.className = 'confetti-piece';
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.backgroundColor = ['#7c3aed', '#f5c518', '#10b981', '#06b6d4'][Math.floor(Math.random()*4)];
                conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
                document.body.appendChild(conf);
                setTimeout(() => conf.remove(), 4000);
            }
            
            showToast(`Payment successful! Welcome to ${title}! Redirecting...`, 'toast-success');
            
            setTimeout(() => {
                window.location.href = `premium-course-player.html?course=${courseId}`;
            }, 2500);
        } else {
            throw new Error(data.message || 'Verification failed');
        }
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Payment enrolled failed. Contact support.', 'toast-error');
    }
}

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
