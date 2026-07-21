/**
 * mock-tests.js — CourseNova Mock Test Hub
 * Handles: Loading packs from API, Rendering cards, Payment (Razorpay), Quiz launch
 */

document.addEventListener('DOMContentLoaded', () => {
    loadMockPacks();
    setupFilters();
    checkPaymentReturn();
});

let allPacks = [];
const API   = window.COURSENOVA_API || '';

// Always read the freshest token at call-time (navigation.js may not be ready at module load)
function getToken() {
    if (typeof getAuthToken === 'function') {
        const t = getAuthToken();
        if (t && t !== 'null' && t !== 'undefined') return t;
    }
    return localStorage.getItem('coursenova_token')
        || localStorage.getItem('token')
        || localStorage.getItem('coursenovaToken')
        || '';
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// ─── Payment Return Check ────────────────────────────────────────────────────
async function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'verify' || !params.get('order_id')) return;

    showToast('Verifying your payment...', 'info');
    try {
        const res = await fetch(`${API}/api/razorpay/order-status/${params.get('order_id')}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (data.ok && data.status === 'paid') {
            showToast('✅ Payment successful! Test pack unlocked.', 'success');
            history.replaceState({}, '', window.location.pathname);
            setTimeout(() => loadMockPacks(), 1000);
        } else {
            showToast('Payment verification pending or failed.', 'error');
        }
    } catch (e) {
        console.error('Verification error:', e);
        showToast('Error verifying payment.', 'error');
    }
}

// ─── Load Packs ─────────────────────────────────────────────────────────────
async function loadMockPacks() {
    try {
        const token = getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API}/api/mocktest/packs`, { headers });
        const data = await res.json();
        if (data.ok && data.packs) {
            allPacks = data.packs;
            renderPacks(allPacks);
        } else {
            document.getElementById('freeTestsGrid').innerHTML  = '<p style="color:#ef4444;padding:20px;">Failed to load tests. Please refresh.</p>';
            document.getElementById('premiumTestsGrid').innerHTML = '';
        }
    } catch (err) {
        console.error('Error loading mock packs:', err);
        showToast('Network error loading test packs', 'error');
    }
}

// ─── Difficulty Helper ───────────────────────────────────────────────────────
function getDiff(pack) {
    const hard  = ['JEE Main', 'NEET', 'UPSC', 'NDA', 'CA Foundation', 'SSC CGL', 'Banking PO'];
    const easy  = ['Coding & DSA', 'Typing & English', 'Communication Skills', 'Home Guard', 'Army GD'];
    if (hard.some(h => (pack.category || '').includes(h) || (pack.title || '').includes(h))) return { label: 'Hard',   cls: 'diff-hard' };
    if (easy.some(e => (pack.category || '').includes(e) || (pack.title || '').includes(e))) return { label: 'Easy',   cls: 'diff-easy' };
    return { label: 'Medium', cls: 'diff-medium' };
}

// ─── Category Icon ───────────────────────────────────────────────────────────
function getCatIcon(category) {
    const map = {
        'CBSE Board': '📚', 'ICSE Board': '📖', 'State Board': '🏫',
        'JEE Main': '⚗️', 'NEET': '🩺', 'CUET': '🎓',
        'NDA': '🎖️', 'CA Foundation': '💼', 'UPSC': '🏛️',
        'SSC': '📋', 'Banking': '🏦', 'Coding & DSA': '💻',
        'English & IELTS': '🇬🇧', 'Aptitude & Reasoning': '🧠',
        'Govt Exam': '🏁', 'National Exam': '🚀', 'Tech Free': '💻'
    };
    for (const [k, v] of Object.entries(map)) {
        if ((category || '').includes(k)) return v;
    }
    return '📋';
}

// ─── Render Packs ────────────────────────────────────────────────────────────
function renderPacks(packs) {
    const techFreeGrid = document.getElementById('techFreeTestsGrid');
    const govtGrid     = document.getElementById('govtTestsGrid');
    const nationalGrid = document.getElementById('nationalTestsGrid');
    const stateBoardGrid = document.getElementById('stateBoardTestsGrid');
    const collegeEntranceGrid = document.getElementById('collegeEntranceTestsGrid');
    
    const techFreeSection = document.getElementById('techFreeTestsSection');
    const govtSection     = document.getElementById('govtTestsSection');
    const nationalSection = document.getElementById('nationalTestsSection');
    const stateBoardSection = document.getElementById('stateBoardTestsSection');
    const collegeEntranceSection = document.getElementById('collegeEntranceTestsSection');

    if (techFreeGrid) techFreeGrid.innerHTML = '';
    if (govtGrid) govtGrid.innerHTML = '';
    if (nationalGrid) nationalGrid.innerHTML = '';
    if (stateBoardGrid) stateBoardGrid.innerHTML = '';
    if (collegeEntranceGrid) collegeEntranceGrid.innerHTML = '';

    let techFreeCount = 0, govtCount = 0, nationalCount = 0, stateBoardCount = 0, collegeEntranceCount = 0;

    packs.forEach(pack => {
        const d        = getDiff(pack);
        const firstTest = pack.tests && pack.tests[0] ? pack.tests[0] : null;
        const totalQs  = pack.totalQuestions !== undefined && pack.totalQuestions !== null && pack.totalQuestions > 0
            ? pack.totalQuestions
            : (firstTest ? (firstTest.numQuestions || 0) : 75);
        const totalTime= pack.durationMinutes !== undefined && pack.durationMinutes !== null && pack.durationMinutes > 0
            ? pack.durationMinutes
            : (firstTest ? (firstTest.durationMinutes || 0) : 90);
        const icon     = getCatIcon(pack.category);
        const marks    = pack.totalMarks !== undefined && pack.totalMarks !== null && pack.totalMarks > 0
            ? pack.totalMarks
            : (firstTest && firstTest.totalMarks ? firstTest.totalMarks : totalQs * 4);
        const testsCount = pack.totalTests !== undefined && pack.totalTests !== null && pack.totalTests > 0
            ? pack.totalTests
            : (pack.tests ? pack.tests.length : 1);

        // Detection for Free vs Premium vs Unlocked/Enrolled cards
        const isActuallyFree = pack.isFree === true || pack.price === 0;
        const isUnlocked = pack.isUnlocked || isActuallyFree;

        const cardHTML = `
        <div class="test-card" data-id="${pack.id}">
            ${isUnlocked 
                ? (isActuallyFree 
                    ? '<div class="badge-free"><i class="fas fa-gift"></i> FREE</div>'
                    : '<div class="badge-free" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff;"><i class="fas fa-check-circle"></i> ENROLLED</div>')
                : '<div class="badge-premium"><i class="fas fa-crown"></i> PREMIUM</div>'
            }
            
            <div class="card-header">
                <span class="subject-tag">${icon} ${pack.category || 'Test Series'}</span>
                <h3>${pack.title}</h3>
            </div>
            <div class="card-body">
                <div class="difficulty-bar">
                    <span class="difficulty-label">Difficulty: ${d.label}</span>
                    <div class="diff-dots ${d.cls}">
                        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                    </div>
                </div>
                <div class="test-stats">
                    <div class="stat-item"><i class="far fa-question-circle"></i> ${totalQs} Questions</div>
                    <div class="stat-item"><i class="far fa-clock"></i> ${totalTime} Mins</div>
                    <div class="stat-item"><i class="far fa-star"></i> ${marks} Marks</div>
                    <div class="stat-item"><i class="fas fa-layer-group"></i> ${testsCount} Tests</div>
                </div>
            </div>
            <div class="card-footer">
                <div class="price-box">
                    ${isUnlocked
                        ? (isActuallyFree
                            ? `<span class="price-display" style="color:#10b981;">FREE</span> <span class="original-price">₹199</span>`
                            : `<span class="price-display" style="color:#10b981;">ENROLLED</span> <span class="original-price">₹${pack.price || 99}</span>`)
                        : `<span class="price-display">₹${pack.price || 99}</span> <span class="original-price">₹199</span>`
                    }
                </div>
                ${isUnlocked
                    ? `<button class="btn-action btn-start" onclick="handleStart('${pack.id}', true)">
                          Start Now <i class="fas fa-arrow-right"></i>
                       </button>`
                    : `<button class="btn-action btn-unlock" onclick="handleStart('${pack.id}', false)">
                          Unlock Now <i class="fas fa-lock"></i>
                       </button>`
                }
            </div>
        </div>`;

        const titleLower = pack.title.toLowerCase();
        const categoryLower = (pack.category || '').toLowerCase();

        const isTech = categoryLower.includes('tech') || 
                       categoryLower.includes('coding') ||
                       titleLower.includes('coding') ||
                       titleLower.includes('ielts') ||
                       titleLower.includes('typing') ||
                       titleLower.includes('communication') ||
                       titleLower.includes('aptitude') ||
                       pack.id.includes('coding') ||
                       pack.id.includes('english-ielts') ||
                       pack.id.includes('aptitude') ||
                       pack.id.includes('typing') ||
                       pack.id.includes('communication');

        const isStateBoard = categoryLower.includes('board') || 
                             titleLower.includes('board') || 
                             titleLower.includes('icse') ||
                             pack.id.includes('board') ||
                             pack.id.includes('cbse') ||
                             pack.id.includes('icse') ||
                             pack.id.includes('bihar-10') ||
                             pack.id.includes('bihar-12') ||
                             pack.id.includes('up-10') ||
                             pack.id.includes('up-12') ||
                             pack.id.includes('punjab-10') ||
                             pack.id.includes('punjab-12');

        const collegeTitles = [
            "BITSAT",
            "VITEEE",
            "LPUNEST",
            "MET (Manipal)",
            "BHU Entrance",
            "AMU Entrance",
            "MET"
        ];
        const isCollegeEntrance = collegeTitles.some(t => titleLower.includes(t.toLowerCase())) || 
                                  categoryLower.includes('college');

        const nationalTitles = [
            "NEET",
            "JEE Main",
            "CUET",
            "NDA",
            "CA Foundation",
            "UPSC"
        ];
        const isNational = nationalTitles.some(t => titleLower.includes(t.toLowerCase())) || 
                           categoryLower.includes('upsc') ||
                           categoryLower.includes('cuet') ||
                           categoryLower.includes('neet') ||
                           categoryLower.includes('jee') ||
                           categoryLower.includes('national');

        if (isTech) {
            if (techFreeGrid) techFreeGrid.innerHTML += cardHTML;
            techFreeCount++;
        } else if (isStateBoard) {
            if (stateBoardGrid) stateBoardGrid.innerHTML += cardHTML;
            stateBoardCount++;
        } else if (isCollegeEntrance) {
            if (collegeEntranceGrid) collegeEntranceGrid.innerHTML += cardHTML;
            collegeEntranceCount++;
        } else if (isNational) {
            if (nationalGrid) nationalGrid.innerHTML += cardHTML;
            nationalCount++;
        } else {
            if (govtGrid) govtGrid.innerHTML += cardHTML;
            govtCount++;
        }
    });

    if (techFreeSection) techFreeSection.style.display = techFreeCount > 0 ? 'block' : 'none';
    if (govtSection) govtSection.style.display = govtCount > 0 ? 'block' : 'none';
    if (nationalSection) nationalSection.style.display = nationalCount > 0 ? 'block' : 'none';
    if (stateBoardSection) stateBoardSection.style.display = stateBoardCount > 0 ? 'block' : 'none';
    if (collegeEntranceSection) collegeEntranceSection.style.display = collegeEntranceCount > 0 ? 'block' : 'none';
}

// ─── Filter Setup ────────────────────────────────────────────────────────────
function setupFilters() {
    const searchInp = document.getElementById('testSearch');
    const catSel    = document.getElementById('subjectFilter');
    const diffSel   = document.getElementById('difficultyFilter');

    if (!searchInp) return;

    const apply = () => {
        const s = searchInp.value.toLowerCase();
        const c = catSel.value.toLowerCase();
        const d = diffSel.value.toLowerCase();

        const filtered = allPacks.filter(p => {
            const matchSearch = p.title.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s);
            const diff        = getDiff(p).label.toLowerCase();
            const matchDiff   = !d || d === diff;
            const matchCat    = !c || (p.category || '').toLowerCase().includes(c);
            return matchSearch && matchDiff && matchCat;
        });
        renderPacks(filtered);
    };

    searchInp.addEventListener('input', apply);
    catSel.addEventListener('change', apply);
    diffSel.addEventListener('change', apply);
}

// ─── Start/Unlock ────────────────────────────────────────────────────────────
async function handleStart(packId, isFreeOrUnlocked) {
    if (!getToken()) {
        showToast('Please login to access tests', 'error');
        setTimeout(() => window.location.href = 'signup.html', 1500);
        return;
    }

    if (isFreeOrUnlocked) {
        // If it's a Board pack with multiple subjects, go to selector
        const pack = allPacks.find(p => p.id === packId);
        if (pack && (pack.totalTests > 1 || (pack.category || '').includes('Board'))) {
            window.location.href = `board-selector.html?board=${encodeURIComponent(pack.title)}&packId=${encodeURIComponent(packId)}`;
            return;
        }
        // Otherwise direct launch
        window.location.href = `quiz-engine.html?packId=${encodeURIComponent(packId)}&mode=mock`;
        return;
    }

    // Paid — check access first
    try {
        showToast('Checking access...', 'info');
        const res  = await fetch(`${API}/api/mocktest/packs/${packId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();

        if (data.ok && !data.locked) {
            // Already unlocked
            const pack = data.pack;
            if (pack && (pack.totalTests > 1 || (pack.category || '').includes('Board'))) {
                window.location.href = `board-selector.html?board=${encodeURIComponent(pack.title)}&packId=${encodeURIComponent(packId)}`;
            } else {
                window.location.href = `quiz-engine.html?packId=${encodeURIComponent(packId)}&mode=mock`;
            }
        } else {
            // Need to pay
            initiateMockPayment(packId);
        }
    } catch (err) {
        console.error('Access check error:', err);
        initiateMockPayment(packId); // Attempt payment
    }
}

// ─── Razorpay Payment ────────────────────────────────────────────────────────
async function initiateMockPayment(packId) {
    if (!getToken()) {
        showToast('Please login first.', 'error');
        return;
    }

    showToast('Initializing secure payment...', 'info');

    try {
        if (typeof Razorpay === 'undefined') {
            showToast('Payment SDK not loaded. Try refreshing.', 'error');
            return;
        }

        // 1. Create order
        const orderRes = await fetch(`${API}/api/razorpay/create-order`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body:    JSON.stringify({ courseId: packId })
        });
        const orderData = await orderRes.json();

        if (!orderData.ok) {
            showToast(orderData.message || 'Failed to create payment order.', 'error');
            return;
        }

        // 2. Launch Razorpay Checkout
        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'CourseNova',
            description: `Purchase - ${orderData.courseTitle || 'Premium Mock Test Pack'}`,
            image: 'images/coursenova-logo.png',
            order_id: orderData.razorpay_order_id,
            handler: async function (response) {
                showToast('⏳ Verifying Payment...', 'info');
                try {
                    const verifyRes = await fetch(`${API}/api/razorpay/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.ok) {
                        showToast('✅ Payment successful! Test pack unlocked.', 'success');
                        setTimeout(() => loadMockPacks(), 1000);
                    } else {
                        showToast('Verification failed: ' + verifyData.message, 'error');
                    }
                } catch (e) {
                    console.error('Verification error:', e);
                    showToast('Verification error.', 'error');
                }
            },
            prefill: {
                name: orderData.prefill?.name || '',
                email: orderData.prefill?.email || '',
                contact: orderData.prefill?.contact || ''
            },
            theme: {
                color: '#1D4ED8'
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error('Payment error:', err);
        showToast('Payment error: ' + err.message, 'error');
    }
}
