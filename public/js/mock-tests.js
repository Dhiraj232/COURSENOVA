/**
 * mock-tests.js — CourseNova Mock Test Hub
 * Handles: Loading packs from API, Rendering cards, Payment (Cashfree), Quiz launch
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
        const res = await fetch(`${API}/api/cashfree/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ orderId: params.get('order_id'), courseId: params.get('pack_id') || 'test' })
        });
        const data = await res.json();
        if (data.ok) {
            showToast('✅ Payment successful! Test pack unlocked.', 'success');
            history.replaceState({}, '', window.location.pathname);
            setTimeout(() => loadMockPacks(), 1000);
        } else {
            showToast('Payment verification failed: ' + (data.message || 'Try again'), 'error');
        }
    } catch (e) {
        console.error('Verification error:', e);
        showToast('Error verifying payment.', 'error');
    }
}

// ─── Load Packs ─────────────────────────────────────────────────────────────
async function loadMockPacks() {
    try {
        const res = await fetch(`${API}/api/mocktest/packs`);
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
    
    const techFreeSection = document.getElementById('techFreeTestsSection');
    const govtSection     = document.getElementById('govtTestsSection');
    const nationalSection = document.getElementById('nationalTestsSection');

    if (techFreeGrid) techFreeGrid.innerHTML = '';
    if (govtGrid) govtGrid.innerHTML = '';
    if (nationalGrid) nationalGrid.innerHTML = '';

    let techFreeCount = 0, govtCount = 0, nationalCount = 0;

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

        // Detection for Free vs Premium cards
        const isActuallyFree = pack.isFree === true || pack.price === 0;

        const cardHTML = `
        <div class="test-card" data-id="${pack.id}">
            ${isActuallyFree 
                ? '<div class="badge-free"><i class="fas fa-gift"></i> FREE</div>'
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
                    ${isActuallyFree
                        ? `<span class="price-display" style="color:#10b981;">FREE</span> <span class="original-price">₹199</span>`
                        : `<span class="price-display">₹${pack.price || 99}</span> <span class="original-price">₹199</span>`
                    }
                </div>
                ${isActuallyFree
                    ? `<button class="btn-action btn-start" onclick="handleStart('${pack.id}', true)">
                          Start Now <i class="fas fa-arrow-right"></i>
                       </button>`
                    : `<button class="btn-action btn-unlock" onclick="handleStart('${pack.id}', false)">
                          Unlock Now <i class="fas fa-lock"></i>
                       </button>`
                }
            </div>
        </div>`;

        const nationalTitles = [
            "NEET",
            "JEE Main",
            "CUET UG",
            "CUET PG",
            "NDA"
        ];

        const collegeTitles = [
            "BITSAT",
            "VITEEE",
            "LPUNEST",
            "MET (Manipal)",
            "BHU Entrance",
            "AMU Entrance"
        ];

        if (nationalTitles.some(t => pack.title.toLowerCase().includes(t.toLowerCase()))) {
            if (nationalGrid) nationalGrid.innerHTML += cardHTML;
            nationalCount++;
        } else if (collegeTitles.some(t => pack.title.toLowerCase().includes(t.toLowerCase()))) {
            if (techFreeGrid) techFreeGrid.innerHTML += cardHTML;
            techFreeCount++;
        } else {
            if (govtGrid) govtGrid.innerHTML += cardHTML;
            govtCount++;
        }
    });

    if (techFreeSection) techFreeSection.style.display = techFreeCount > 0 ? 'block' : 'none';
    if (govtSection) govtSection.style.display = govtCount > 0 ? 'block' : 'none';
    if (nationalSection) nationalSection.style.display = nationalCount > 0 ? 'block' : 'none';
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
async function handleStart(packId, isFree) {
    if (!getToken()) {
        showToast('Please login to access tests', 'error');
        setTimeout(() => window.location.href = 'signup.html', 1500);
        return;
    }

    if (isFree) {
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
            window.location.href = `quiz-engine.html?packId=${encodeURIComponent(packId)}&mode=mock`;
        } else {
            // Need to pay
            initiateMockPayment(packId);
        }
    } catch (err) {
        console.error('Access check error:', err);
        initiateMockPayment(packId); // Attempt payment
    }
}

// ─── Cashfree Payment ────────────────────────────────────────────────────────
async function initiateMockPayment(packId) {
    if (!getToken()) {
        showToast('Please login first.', 'error');
        return;
    }

    showToast('Initializing secure payment...', 'info');

    try {
        // 1. Get Cashfree mode
        const cfgRes  = await fetch(`${API}/api/cashfree/config`);
        const cfgData = await cfgRes.json();
        const sdkMode = cfgData.mode || 'sandbox';

        if (typeof Cashfree === 'undefined') {
            showToast('Payment SDK not loaded. Try refreshing.', 'error');
            return;
        }
        const cashfree = Cashfree({ mode: sdkMode });

        // 2. Create order — reuse /api/cashfree/create-order with courseId = packId
        const orderRes = await fetch(`${API}/api/cashfree/create-order`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body:    JSON.stringify({ courseId: packId })
        });
        const orderData = await orderRes.json();

        if (!orderData.ok) {
            showToast(orderData.message || 'Failed to create payment order.', 'error');
            return;
        }

        // 3. Launch Cashfree checkout
        const returnBase = window.location.href.split('?')[0];
        cashfree.checkout({
            paymentSessionId: orderData.payment_session_id,
            returnUrl: `${returnBase}?payment=verify&order_id=${orderData.orderId}&pack_id=${packId}`
        });

    } catch (err) {
        console.error('Payment error:', err);
        showToast('Payment error: ' + err.message, 'error');
    }
}
