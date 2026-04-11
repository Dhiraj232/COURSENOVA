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
const TOKEN = localStorage.getItem('coursenova_token') || localStorage.getItem('coursenovaToken') || '';
const API   = window.COURSENOVA_API || '';

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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
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
    const hard  = ['JEE Main', 'NEET', 'UPSC', 'NDA', 'CA Foundation'];
    const easy  = ['Coding & DSA', 'Typing & English', 'Communication Skills'];
    if (hard.some(h => (pack.category || '').includes(h))) return { label: 'Hard',   cls: 'diff-hard' };
    if (easy.some(e => (pack.category || '').includes(e))) return { label: 'Easy',   cls: 'diff-easy' };
    return { label: 'Medium', cls: 'diff-medium' };
}

// ─── Category Icon ───────────────────────────────────────────────────────────
function getCatIcon(category) {
    const map = {
        'CBSE Board': '📚', 'ICSE Board': '📖', 'State Board': '🏫',
        'JEE Main': '⚗️', 'NEET': '🩺', 'CUET': '🎓',
        'NDA': '🎖️', 'CA Foundation': '💼', 'UPSC': '🏛️',
        'SSC CGL': '📋', 'SSC CHSL': '📝', 'Coding & DSA': '💻',
        'English & IELTS': '🇬🇧', 'Aptitude & Reasoning': '🧠',
        'Typing & English': '⌨️', 'Communication Skills': '🗣️'
    };
    for (const [k, v] of Object.entries(map)) {
        if ((category || '').includes(k)) return v;
    }
    return '📋';
}

// ─── Render Packs ────────────────────────────────────────────────────────────
function renderPacks(packs) {
    const freeGrid    = document.getElementById('freeTestsGrid');
    const premiumGrid = document.getElementById('premiumTestsGrid');

    freeGrid.innerHTML    = '';
    premiumGrid.innerHTML = '';

    let freeCount = 0, paidCount = 0;

    packs.forEach(pack => {
        const d        = getDiff(pack);
        const totalQs  = pack.tests && pack.tests[0] ? pack.tests[0].numQuestions : 35;
        const totalTime= pack.tests && pack.tests[0] ? pack.tests[0].durationMinutes : 60;
        const icon     = getCatIcon(pack.category);
        const marks    = totalQs * 4;

        const cardHTML = `
        <div class="test-card" data-id="${pack.id}" data-free="${pack.isFree}" data-cat="${pack.category || ''}">
            ${pack.isFree
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
                    <div class="stat-item"><i class="fas fa-layer-group"></i> ${pack.totalTests || 1} Tests</div>
                </div>
            </div>
            <div class="card-footer">
                <div class="price-box">
                    ${pack.isFree
                        ? `<span class="price-display" style="color:#10b981;">FREE</span> <span class="original-price">₹${pack.price || 199}</span>`
                        : `<span class="price-display">₹${pack.price}</span>`
                    }
                </div>
                ${pack.isFree
                    ? `<button class="btn-action btn-start" onclick="handleStart('${pack.id}', true)">
                          Start Now <i class="fas fa-arrow-right"></i>
                       </button>`
                    : `<button class="btn-action btn-unlock" onclick="handleStart('${pack.id}', false)">
                          Unlock ₹${pack.price} <i class="fas fa-lock-open"></i>
                       </button>`
                }
            </div>
        </div>`;

        if (pack.isFree) { freeGrid.innerHTML  += cardHTML; freeCount++; }
        else             { premiumGrid.innerHTML += cardHTML; paidCount++; }
    });

    if (freeCount  === 0) freeGrid.innerHTML    = '<p style="color:#6b7280;padding:20px;text-align:center;">No free tests match your filter.</p>';
    if (paidCount  === 0) premiumGrid.innerHTML = '<p style="color:#6b7280;padding:20px;text-align:center;">No premium tests match your filter.</p>';
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
    if (!TOKEN) {
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
            headers: { 'Authorization': `Bearer ${TOKEN}` }
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
    if (!TOKEN) {
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
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
            returnUrl: `${returnBase}?payment=verify&order_id=${orderData.order_id}&pack_id=${packId}`
        });

    } catch (err) {
        console.error('Payment error:', err);
        showToast('Payment error: ' + err.message, 'error');
    }
}
