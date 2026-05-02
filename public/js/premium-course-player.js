// API base is auto-detected by config.js (localhost in dev, Render in prod)
const API = window.COURSENOVA_API || 'https://coursenova-ai.onrender.com';
let token = '';
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course');

let courseData = null;
let currentLessonIdx = 0;
let progressData = null;
let examAttemptsLeft = 3;

document.addEventListener('DOMContentLoaded', async () => {
    token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || '');
    if (!courseId) {
        window.location.href = 'certificates.html';
        return;
    }

    const isPaymentVerify = params.get('payment') === 'verify';
    const orderId = params.get('order_id');

    if (isPaymentVerify && orderId) {
        // Automatically hide layout and verify payment with backend
        document.getElementById('playerLayout').style.display = 'none';
        document.getElementById('lockedScreen').style.display = 'none';
        showToast('Verifying your payment, please wait...', 'toast-success');
        await verifyCashfreePayment(orderId, courseId);
        // Clear params to prevent re-verifying on refresh
        window.history.replaceState({}, document.title, window.location.pathname + "?course=" + courseId);
    }

    await loadCoursePlayer();
});

async function verifyCashfreePayment(orderId, courseId) {
    try {
        showToast('Verifying your payment, please wait...', 'toast-success');

        // First try: call /verify which checks Cashfree API server-side
        const res = await fetch(`${API}/api/cashfree/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orderId, courseId })
        });
        const data = await res.json();

        if (data.ok) {
            fireConfetti();
            showToast('🎉 Payment verified! Welcome to the course.', 'toast-success');
            // Sync user data to unlock content globally
            if (typeof window.refreshUserData === 'function') await window.refreshUserData();
            return; // Done
        }

        // ... pollling logic ...

        if (confirmed) {
            fireConfetti();
            showToast('🎉 Payment confirmed! Welcome to the course.', 'toast-success');
            // Sync user data to unlock content globally
            if (typeof window.refreshUserData === 'function') await window.refreshUserData();
        } else {
            showToast(
                data.message || 'Payment not confirmed yet. If you paid, access will unlock within minutes.',
                'toast-error'
            );
        }
    } catch (err) {
        console.error('[verifyCashfreePayment]', err);
        showToast('Network error during payment verification. If you paid, please contact support.', 'toast-error');
    }
}

/**
 * Polls /api/cashfree/order-status/:orderId until status is "paid" or max attempts reached.
 * @param {string} orderId
 * @param {number} maxAttempts
 * @param {number} intervalMs
 * @returns {boolean} true if "paid"
 */
async function pollOrderStatus(orderId, maxAttempts, intervalMs) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, intervalMs));
        try {
            const res = await fetch(`${API}/api/cashfree/order-status/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok && data.status === 'paid') {
                console.log(`[pollOrderStatus] ✅ Confirmed on attempt ${attempt}`);
                return true;
            }
            if (data.status === 'failed') {
                console.warn(`[pollOrderStatus] ❌ Order failed on attempt ${attempt}`);
                return false;
            }
            console.log(`[pollOrderStatus] Attempt ${attempt}/${maxAttempts}: status=${data.status}`);
        } catch (e) {
            console.warn(`[pollOrderStatus] Network error on attempt ${attempt}:`, e.message);
        }
    }
    return false; // Timed out
}

function fireConfetti() {
    for (let i = 0; i < 30; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = ['#7c3aed', '#f5c518', '#10b981', '#06b6d4'][Math.floor(Math.random() * 4)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}


async function loadCoursePlayer() {
    if (!token) {
        window.location.href = 'signup.html';
        return;
    }

    try {
        const res = await fetch(`${API}/api/premium/course/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.ok) throw new Error(data.message || 'Failed to load course');

        courseData = data.course;
        progressData = data.progress || { completedLessons: [] };
        examAttemptsLeft = data.examAttemptsLeft !== undefined ? data.examAttemptsLeft : 3;

        document.getElementById('sidebarCourseTitle').innerText = courseData.title;

        if (!data.enrolled) {
            // Show Locked Screen
            document.getElementById('lockedScreen').style.display = 'flex';
            document.getElementById('playerLayout').style.display = 'none';
        } else {
            // Show Player Layout
            document.getElementById('lockedScreen').style.display = 'none';
            document.getElementById('playerLayout').style.display = 'grid';

            renderLessonList();
            updateOverallProgress();

            if (courseData.lessons && courseData.lessons.length > 0) {
                // Auto-resume: Find the first uncompleted lesson
                let resumeIdx = 0;
                if (progressData.completedLessons && progressData.completedLessons.length > 0) {
                    resumeIdx = courseData.lessons.findIndex(l => !progressData.completedLessons.includes(l.lessonId));
                    if (resumeIdx === -1) resumeIdx = 0; // If all completed, start at 0
                }
                loadLesson(resumeIdx);
            }

            if (progressData.isCompleted) {
                showCertSection();
            }
        }
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Error connecting to course engine', 'toast-error');
    }
}

function renderLessonList() {
    const list = document.getElementById('lessonList');
    if (!courseData.lessons || courseData.lessons.length === 0) {
        list.innerHTML = '<li style="padding:20px;color:gray">No lessons found.</li>';
        return;
    }

    list.innerHTML = courseData.lessons.map((lesson, idx) => {
        const isCompleted = progressData.completedLessons && progressData.completedLessons.includes(lesson.lessonId);
        const isActive = idx === currentLessonIdx;

        return `
        <li class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'done' : ''}" onclick="loadLesson(${idx})">
            <div class="lesson-check"><i class="fas ${isCompleted ? 'fa-check' : 'fa-play'}"></i></div>
            <div class="lesson-title">${idx + 1}. ${lesson.title}</div>
        </li>`;
    }).join('');
}

function loadLesson(idx) {
    if (!courseData.lessons || !courseData.lessons[idx]) return;
    currentLessonIdx = idx;
    const lesson = courseData.lessons[idx];

    // Update active state
    renderLessonList();
    showTab('overview');

    // Update headers
    document.getElementById('lessonTitleDisplay').textContent = lesson.title;

    // Switch video
    const vf = document.getElementById('videoFrame');
    if (lesson.videoUrl && lesson.videoUrl.startsWith('http')) {
        vf.src = lesson.videoUrl;
    } else {
        vf.src = '';
    }

    // Switch PDF
    const pf = document.getElementById('pdfFrame');
    const pfb = document.getElementById('pdfFallbackLink');
    if (lesson.pdfUrl) {
        const url = lesson.pdfUrl.startsWith('http') ? lesson.pdfUrl : `${API}/${lesson.pdfUrl}`;
        pf.src = url;
        pfb.href = url;
    } else {
        pf.src = '';
        pfb.href = '#';
    }

    // Mark complete button logic
    const btn = document.getElementById('markCompleteBtn');
    if (progressData.completedLessons && progressData.completedLessons.includes(lesson.lessonId)) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        btn.classList.add('completed');
        btn.disabled = true;
    } else {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark as Complete';
        btn.classList.remove('completed');
        btn.disabled = false;
    }
}

async function markLessonComplete() {
    const lesson = courseData.lessons[currentLessonIdx];
    if (!lesson) return;

    const btn = document.getElementById('markCompleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await fetch(`${API}/api/course/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                courseId: courseData._id,
                lessonId: lesson.lessonId,
                totalLessons: courseData.lessons.length
            })
        });
        const data = await res.json();

        if (data.ok) {
            if (!progressData.completedLessons) progressData.completedLessons = [];
            progressData.completedLessons.push(lesson.lessonId);
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
            btn.classList.add('completed');

            renderLessonList();
            updateOverallProgress();

            // Auto-advance
            if (currentLessonIdx < courseData.lessons.length - 1) {
                setTimeout(() => loadLesson(currentLessonIdx + 1), 800);
            } else {
                showToast('All lessons complete! Ready for the exam!', 'toast-success');
                setTimeout(() => showTab('exam'), 1500);
            }
        }
    } catch (err) {
        showToast('Saving progress failed', 'toast-error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark as Complete';
    }
}

function updateOverallProgress() {
    const total = courseData.lessons ? courseData.lessons.length : 1;
    const completed = progressData.completedLessons ? progressData.completedLessons.length : 0;
    let pct = Math.round((completed / total) * 100);

    if (progressData.isCompleted) pct = 100;

    document.getElementById('overallFill').style.width = pct + '%';
    document.getElementById('overallLabel').textContent = pct + '% complete';
}

function showTab(tabName) {
    document.querySelectorAll('.player-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');

    document.querySelectorAll('.player-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('content-' + tabName).classList.add('active');

    if (tabName === 'exam') {
        renderExam();
    }
}

function scrollToExam() {
    showTab('exam');
}

// ── EXAM ENGINE ──────────────────────────────────────────────────────────

function renderExam() {
    // Check Attempts
    document.getElementById('attemptsLeftBadge').textContent =
        examAttemptsLeft > 0 ? `${examAttemptsLeft} attempts left` : 'No attempts left';

    if (examAttemptsLeft <= 0 && !progressData.isCompleted) {
        document.getElementById('examLockedMsg').style.display = 'block';
        document.getElementById('examActions').style.display = 'none';
        document.getElementById('examQuestions').innerHTML = '';
        return;
    }

    if (progressData.isCompleted) {
        showCertSection();
        document.getElementById('examLockedMsg').style.display = 'none';
        document.getElementById('examActions').style.display = 'none';
        document.getElementById('examQuestions').innerHTML = '<div style="padding:20px;text-align:center;color:var(--premium-green)">You have already passed this exam!</div>';
        return;
    }

    if (!courseData.quizQuestions || courseData.quizQuestions.length === 0) {
        document.getElementById('examQuestions').innerHTML = '<p>No questions configured for this course yet.</p>';
        return;
    }

    const wrapper = document.getElementById('examQuestions');
    let html = '';

    courseData.quizQuestions.forEach((q, qIndex) => {
        html += `
        <div class="exam-question">
            <div class="exam-q-num">Question ${qIndex + 1}</div>
            <div class="exam-q-text">${q.question}</div>
            <div class="exam-options">
                ${q.options.map((opt, oIndex) => `
                <label class="exam-option" id="opt-${qIndex}-${oIndex}">
                    <input type="radio" name="q${qIndex}" value="${oIndex}" onchange="selectOption(${qIndex}, ${oIndex})">
                    ${opt}
                </label>
                `).join('')}
            </div>
        </div>`;
    });

    wrapper.innerHTML = html;
    document.getElementById('examActions').style.display = 'block';
}

window.selectOption = function(qIndex, oIndex) {
    // Remove selected class from all options in this question
    document.querySelectorAll(`[id^="opt-${qIndex}-"]`).forEach(el => el.classList.remove('selected'));
    // Add selected class to the chosen option
    document.getElementById(`opt-${qIndex}-${oIndex}`).classList.add('selected');
};

async function submitExam() {
    if (!courseData.quizQuestions) return;

    let answers = [];
    let allAnswered = true;

    courseData.quizQuestions.forEach((_, qIndex) => {
        const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
        if (selected) {
            answers.push(parseInt(selected.value));
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        showToast('Please answer all questions before submitting', 'toast-error');
        return;
    }

    const btn = document.getElementById('submitExamBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Grading...';

    try {
        const res = await fetch(`${API}/api/premium/submit-exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ courseId: courseData._id, answers })
        });

        const data = await res.json();
        if (data.ok) {
            examAttemptsLeft = data.attemptsLeft;

            document.getElementById('examActions').style.display = 'none';
            const resultDiv = document.getElementById('examResult');
            resultDiv.style.display = 'block';

            if (data.passed) {
                progressData.isCompleted = true;
                progressData.certId = data.certId;
                updateOverallProgress();

                resultDiv.innerHTML = `
                <div class="exam-result pass">
                    <div class="exam-result-icon">🎉</div>
                    <h3>Passed! ${data.score}%</h3>
                    <p>You got ${data.correct} out of ${data.total} correct.</p>
                </div>`;

                setTimeout(() => showCertSection(), 1500);

                // Confetti !
                for(let i=0; i<30; i++) {
                    const conf = document.createElement('div');
                    conf.className = 'confetti-piece';
                    conf.style.left = Math.random() * 100 + 'vw';
                    conf.style.backgroundColor = ['#7c3aed', '#f5c518', '#10b981', '#06b6d4'][Math.floor(Math.random()*4)];
                    conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
                    document.body.appendChild(conf);
                    setTimeout(() => conf.remove(), 4000);
                }

            } else {
                resultDiv.innerHTML = `
                <div class="exam-result fail">
                    <div class="exam-result-icon">😔</div>
                    <h3>Score: ${data.score}%</h3>
                    <p>You failed the exam. You needed 60% to pass.</p>
                    <p style="margin-top:10px;font-weight:700">${data.attemptsLeft} attempt(s) remaining.</p>
                    ${data.attemptsLeft > 0 ? '<button class="sidebar-exam-btn" onclick="retryExam()">Retry Exam</button>' : ''}
                </div>`;
            }
        } else {
            throw new Error(data.message || 'Exam submission failed');
        }

    } catch (err) {
        showToast(err.message, 'toast-error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Exam';
    }
}

window.retryExam = function() {
    document.getElementById('examResult').style.display = 'none';
    const btn = document.getElementById('submitExamBtn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Exam';
    renderExam();
};

function showCertSection() {
    document.getElementById('certSection').style.display = 'block';

    if (progressData && progressData.certId) {
        const btn = document.getElementById('downloadCertBtn');
        btn.href = `view-certificate.html?id=${progressData.certId}`;
        btn.innerHTML = '<i class="fas fa-certificate"></i> View & Download Certificate';
    }
}

function showToast(msg, typeClass = 'toast-success') {
    const toast = document.getElementById('premToast');
    const title = document.getElementById('premToastTitle');
    const desc  = document.getElementById('premToastMsg');

    toast.className = `prem-toast ${typeClass} active`;
    if (title) title.textContent = typeClass === 'toast-success' ? 'Success' : 'Notice';
    if (desc) desc.textContent = msg;

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('active'), 4000);
}
