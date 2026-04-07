document.addEventListener('DOMContentLoaded', () => {
    loadMockPacks();
    setupFilters();
});

let allPacks = [];

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-info-circle';
    if(type === 'success') icon = 'fa-check-circle';
    if(type === 'error') icon = 'fa-exclamation-circle';
    
    toast.innerHTML = `<i class="fas ${icon}" style="color: ${type==='error'?'#ef4444':'#10b981'}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function loadMockPacks() {
    try {
        const res = await fetch(`${window.RENVOX_API || ''}/api/mocktest/packs`);
        const data = await res.json();
        if (data.ok) {
            allPacks = data.packs;
            renderPacks(allPacks);
        } else {
            showToast('Failed to fetch tests', 'error');
        }
    } catch (err) {
        console.error('Error fetching mock tests:', err);
        showToast('Network error loading test packs', 'error');
    }
}

function getDifficultyData(pack) {
    // Determine difficulty (Mocking logic; you can add 'difficulty' to Mongo later)
    // If it's a JEE/NEET test, likely Hard. If School, Medium/Easy
    if (pack.category && ['JEE Main', 'NEET', 'UPSC'].includes(pack.category)) {
        return { diff: 'Hard', class: 'diff-hard' };
    }
    if (pack.category && ['Class 9', 'Class 10'].includes(pack.category)) {
        return { diff: 'Easy', class: 'diff-easy' };
    }
    return { diff: 'Medium', class: 'diff-medium' };
}

function renderPacks(packs) {
    const freeGrid = document.getElementById('freeTestsGrid');
    const premiumGrid = document.getElementById('premiumTestsGrid');
    
    freeGrid.innerHTML = '';
    premiumGrid.innerHTML = '';
    
    let freeCount = 0;
    let premiumCount = 0;

    packs.forEach(pack => {
        const d = getDifficultyData(pack);
        // Estimate Qs and Time
        const totalQs = pack.tests && pack.tests[0] ? pack.tests[0].numQuestions : 0;
        const totalTime = pack.tests && pack.tests[0] ? pack.tests[0].durationMinutes : 0;
        
        let marks = totalQs * 4; // Mock assumption 4 marks per Q
        
        const cardHTML = `
            <div class="test-card">
                ${pack.isFree ? '<div class="badge-free"><i class="fas fa-gift"></i> FREE</div>' : '<div class="badge-premium"><i class="fas fa-crown"></i> PREMIUM</div>'}
                <div class="card-header">
                    <span class="subject-tag">${pack.category || 'Competative'}</span>
                    <h3>${pack.title}</h3>
                </div>
                <div class="card-body">
                    <div class="difficulty-bar">
                        <span class="difficulty-label">Difficulty: ${d.diff}</span>
                        <div class="diff-dots ${d.class}">
                            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                        </div>
                    </div>
                    <div class="test-stats">
                        <div class="stat-item"><i class="far fa-question-circle"></i> ${totalQs || 30} Questions</div>
                        <div class="stat-item"><i class="far fa-clock"></i> ${totalTime || 30} Mins</div>
                        <div class="stat-item"><i class="far fa-star"></i> ${marks || 120} Marks</div>
                        <div class="stat-item"><i class="fas fa-layer-group"></i> ${pack.totalTests || 1} Tests</div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="price-box">
                        ${pack.isFree ? `<span class="price-display">₹0</span> <span class="original-price">₹${pack.price || 199}</span>` 
                                      : `<span class="price-display">₹${pack.price || 199}</span>`}
                    </div>
                    ${pack.isFree 
                        ? `<button class="btn-action btn-start" onclick="handleCardAction('${pack.id}', true)">Start Test <i class="fas fa-arrow-right"></i></button>`
                        : `<button class="btn-action btn-unlock" onclick="handleCardAction('${pack.id}', false)">Unlock Now <i class="fas fa-lock-open"></i></button>`
                    }
                </div>
            </div>
        `;
        
        if (pack.isFree) {
            freeGrid.innerHTML += cardHTML;
            freeCount++;
        } else {
            premiumGrid.innerHTML += cardHTML;
            premiumCount++;
        }
    });
    
    if(freeCount === 0) freeGrid.innerHTML = '<p style="color:#6b7280;">No free tests match your filter.</p>';
    if(premiumCount === 0) premiumGrid.innerHTML = '<p style="color:#6b7280;">No premium tests match your filter.</p>';
}

function setupFilters() {
    const searchInp = document.getElementById('testSearch');
    const catSel = document.getElementById('subjectFilter');
    const diffSel = document.getElementById('difficultyFilter');
    
    const apply = () => {
        const s = searchInp.value.toLowerCase();
        const c = catSel.value;
        const d = diffSel.value.toLowerCase();
        
        const filtered = allPacks.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s);
            const diffData = getDifficultyData(p).diff.toLowerCase();
            const matchesDiff = d === '' || d === diffData;
            
            // basic category loosely mapping 
            let matchesCat = true;
            if (c === 'School Classes' && p.category && !p.category.includes('Class')) matchesCat = false;
            if (c === 'Competitive Exams' && p.category && p.category.includes('Class')) matchesCat = false;
            
            return matchesSearch && matchesDiff && matchesCat;
        });
        renderPacks(filtered);
    };
    
    searchInp.addEventListener('input', apply);
    catSel.addEventListener('change', apply);
    diffSel.addEventListener('change', apply);
}

// Handler for Unlock or Start
async function handleCardAction(packId, isFree) {
    const token = localStorage.getItem('renvox_token') || localStorage.getItem('renvoxToken');
    if (!token) {
        showToast('Please login to access mock tests', 'error');
        setTimeout(() => window.location.href = 'index.html#login', 1500);
        return;
    }

    try {
        const res = await fetch(`${window.RENVOX_API || ''}/api/mocktest/packs/${packId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.ok) {
            // If API says it's locked, we must purchase
            if (data.locked) {
                initiateMockPurchase(packId);
            } else {
                // Unlocked or Free -> Redirect to quiz engine
                window.location.href = `quiz-engine.html?packId=${packId}&mode=mock`;
            }
        }
    } catch (err) { 
        console.error('Pack act err:', err); 
        showToast('Error validating pack access', 'error');
    }
}

async function initiateMockPurchase(packId) {
    const token = localStorage.getItem('renvox_token') || localStorage.getItem('renvoxToken');
    showToast('Initializing secure payment...', 'info');

    try {
        // Fetch correct mode (sandbox/production)
        const configRes = await fetch(`${window.RENVOX_API || ''}/api/cashfree/config`);
        const configData = await configRes.json();
        const sdkMode = configData.mode || 'sandbox';

        console.log(`[initiateMockPurchase] Launching Cashfree in ${sdkMode} mode`);
        const cashfreeInstance = Cashfree({ mode: sdkMode });

        const res = await fetch(`${window.RENVOX_API || ''}/api/cashfree/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ courseId: packId }) 
        });
        
        const orderData = await res.json();
        
        if (!orderData.ok) {
            showToast(orderData.message || "Failed to create order", 'error');
            return;
        }

        if (typeof Cashfree === 'undefined') {
            showToast('Payment system not loaded. Please refresh the page.', 'error');
            return;
        }

        cashfreeInstance.checkout({ 
            paymentSessionId: orderData.payment_session_id,
            returnUrl: window.location.href + (window.location.href.includes('?') ? '&' : '?') + "payment=verify&order_id=" + orderData.order_id
        });
        
    } catch (err) {
        showToast('Purchase error: ' + err.message, 'error');
    }
}
