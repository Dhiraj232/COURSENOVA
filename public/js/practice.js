/**
 * COURSENOVA - Practice Hub Logic
 * Handles MCQ, Coding, Daily Quiz, Leaderboard, and AI Chat Integration
 */

// ==========================================
// 🛡️ AUTH & STATE
// ==========================================
let token = '';
let user = {};
let isLoggedIn = false;

let currentQuestions = [];
let currentIndex = 0;
let userScore = 0;
let isDailyQuiz = false;

// ==========================================
// 🎯 INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    token = typeof getAuthToken === 'function' ? getAuthToken() : (localStorage.getItem('token') || localStorage.getItem('coursenovaToken'));
    user = typeof getAuthUser === 'function' ? getAuthUser() : JSON.parse(localStorage.getItem('user') || '{}');
    isLoggedIn = !!token;
    
    loadQuestions();
    loadLeaderboard();
});


// ==========================================
// 📑 UI LOGIC (TAB SWITCHING)
// ==========================================
function showSection(sectionId, btn) {
    document.querySelectorAll('.practice-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ==========================================
// 🧩 MCQ PRACTICE SYSTEM
// ==========================================
async function loadQuestions(category = 'All') {
    const cat = category === 'All' ? document.getElementById('mcqCategory')?.value || 'All' : category;
    const container = document.getElementById('mcqContainer');
    if (container) container.innerHTML = '<div class="loader">Fetching questions...</div>';

    try {
        const res = await fetch(`/api/practice/questions?category=${cat}&limit=10`);
        const data = await res.json();
        if (data.ok && data.questions.length > 0) {
            currentQuestions = data.questions;
            currentIndex = 0;
            userScore = 0;
            isDailyQuiz = false;
            renderCurrentQuestion();
        } else {
            if (container) container.innerHTML = '<div class="error">No questions found for this category.</div>';
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function renderCurrentQuestion() {
    const container = document.getElementById('mcqContainer');
    const q = currentQuestions[currentIndex];

    // Update progress bar
    const prog = document.getElementById('mcqProgress');
    if (prog) prog.style.width = `${((currentIndex + 1) / currentQuestions.length) * 100}%`;

    container.innerHTML = `
        <div class="question-card">
            <div class="test-meta" style="margin-bottom: 10px; font-size: 0.85rem; color: #64748b;">
                Category: ${q.category} | Difficulty: ${q.difficulty} | Question ${currentIndex + 1}/${currentQuestions.length}
            </div>
            <div class="question-text">${q.question}</div>
            <div class="options-grid">
                ${q.options.map((opt, i) => `
                    <button class="option-btn" onclick="checkAnswer('${opt.replace(/'/g, "\\'")}', this)">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="practice-controls" style="display: flex; gap: 15px; margin-top: 15px;">
            <button class="btn-run" style="background: #e2e8f0; color: #475569; display: ${currentIndex === 0 ? 'none' : 'flex'};" onclick="goPrevious()">
                <i class="fas fa-arrow-left"></i> Previous
            </button>
            <button class="btn-run" style="background: #6366f1; color: white; display: ${currentIndex === currentQuestions.length - 1 ? 'none' : 'flex'};" onclick="goNext()">
                Next <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
}

function goPrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

function goNext() {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        renderCurrentQuestion();
    }
}


function checkAnswer(selected, btn) {
    const q = currentQuestions[currentIndex];
    const options = document.querySelectorAll('.option-btn');
    options.forEach(o => o.disabled = true); // Disable further clicks

    const selectedClean = selected.trim();
    const correctClean = q.correctAnswer.trim();

    if (selectedClean === correctClean) {
        btn.classList.add('correct');
        userScore++;
    } else {
        btn.classList.add('wrong');
        // highlight correct one
        options.forEach(o => {
            if (o.innerText.trim() === q.correctAnswer.trim()) o.classList.add('correct');
        });
    }

    setTimeout(() => {
        currentIndex++;
        if (currentIndex < currentQuestions.length) {
            renderCurrentQuestion();
        } else {
            showFinalScore();
        }
    }, 1500);
}

function showFinalScore() {
    const container = document.getElementById('mcqContainer');
    const percent = Math.round((userScore / currentQuestions.length) * 100);

    container.innerHTML = `
        <div class="section-card" style="text-align: center; border: none; box-shadow: none;">
            <i class="fas fa-trophy" style="font-size: 4rem; color: #fbbf24; margin-bottom: 20px;"></i>
            <h2>Practice Completed!</h2>
            <p style="font-size: 1.5rem; margin: 15px 0;">Your Score: <strong>${userScore} / ${currentQuestions.length}</strong> (${percent}%)</p>
            <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${percent}%;"></div></div>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                <button class="btn-run" onclick="loadQuestions()">Restart Practice</button>
                <button class="btn-run" style="background: #e2e8f0; color: #475569;" onclick="window.location.href='dashboard.html'">Back to Dashboard</button>
            </div>
            ${isDailyQuiz ? `<button class="btn-run" style="margin-top: 10px; background: #6366f1;" onclick="submitQuizToLeaderboard()">Submit to Leaderboard</button>` : ''}
        </div>
    `;
}

// ==========================================
// 💻 CODING PRACTICE
// ==========================================
async function runCode() {
    const code = document.getElementById('codeEditor').value;
    const resultDiv = document.getElementById('runResult');

    if (!isLoggedIn) {
        alert('Please login to submit code solutions.');
        return;
    }

    if (!code || code.length < 10) {
        resultDiv.innerHTML = '<span style="color:red">Code is too short!</span>';
        return;
    }

    resultDiv.innerHTML = 'Running...';

    try {
        const res = await fetch('/api/practice/submit-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ problemId: 'placeholder', code })
        });
        const data = await res.json();

        if (data.ok) {
            resultDiv.innerHTML = `<span style="color:#10b981; font-weight:700;"><i class="fas fa-check-circle"></i> ${data.message}</span>`;
            confettiEffect();
        } else {
            resultDiv.innerHTML = `<span style="color:#ef4444">${data.message}</span>`;
        }
    } catch (err) {
        resultDiv.innerHTML = '<span style="color:red">Server error.</span>';
    }
}

function confettiEffect() {
    // Simple visual feedback
    console.log("Success! Happy Coding!");
}

// ==========================================
// 🎯 DAILY QUIZ & LEADERBOARD
// ==========================================
async function startDailyQuiz() {
    if (!isLoggedIn) {
        alert('Daily Quiz requires login to track your rank!');
        window.location.href = 'signup.html';
        return;
    }

    const container = document.getElementById('dailyQuizContainer');
    container.innerHTML = '<div class="loader">Loading Daily 5 Questions...</div>';

    try {
        const res = await fetch('/api/practice/daily-quiz');
        const data = await res.json();
        if (data.ok) {
            currentQuestions = data.questions;
            currentIndex = 0;
            userScore = 0;
            isDailyQuiz = true;

            // Re-use MCQ renderer but inject it into quiz section
            const mcqTarget = document.getElementById('mcqContainer');
            document.getElementById('mcq-section').classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[onclick*="mcq-section"]').classList.add('active');

            renderCurrentQuestion();
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitQuizToLeaderboard() {
    try {
        const res = await fetch('/api/practice/submit-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ score: userScore })
        });
        const data = await res.json();
        if (data.ok) {
            alert('Score submitted! Check your rank on the leaderboard.');
            loadLeaderboard();
            showSection('quiz-section', document.querySelector('[onclick*="quiz-section"]'));
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/practice/leaderboard');
        const data = await res.json();
        if (data.ok && data.entries.length > 0) {
            tbody.innerHTML = data.entries.map((e, i) => `
                <tr style="animation: fadeIn 0.3s ease forwards; animation-delay: ${i * 0.1}s">
                    <td class="rank rank-${i + 1}">${i + 1}</td>
                    <td><div style="display:flex; align-items:center; gap:8px;"><div style="width:24px; height:24px; background:#e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px;">${e.username.charAt(0)}</div> ${e.username}</div></td>
                    <td><strong>${e.score}</strong></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3">No entries yet today. Be the first!</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="3">Failed to load leaderboard.</td></tr>';
    }
}

// ==========================================
// 🤖 AI DOUBT SOLVER
// ==========================================
function toggleAIChat() {
    document.getElementById('aiChatWindow').classList.toggle('active');
}

async function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    appendMessage(msg, 'user');
    input.value = '';

    const typingMsg = appendMessage('Typing...', 'bot');

    try {
        const res = await fetch('/api/ai/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();

        typingMsg.remove();
        if (data.ok) {
            appendMessage(data.reply, 'bot');
        } else {
            appendMessage('Sorry, I am having trouble connecting.', 'bot');
        }
    } catch (err) {
        typingMsg.remove();
        appendMessage('Error contacting AI.', 'bot');
    }
}

function appendMessage(text, side) {
    const chatMsgs = document.getElementById('chatMsgs');
    const div = document.createElement('div');
    div.className = `msg ${side}`;
    div.innerText = text;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
}
