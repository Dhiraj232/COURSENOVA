/**
 * RENVOX - Practice Dashboard
 * Manages all practice-related functionality including topic practice, 
 * chapter tests, mock tests, subject filtering, and analytics
 * 
 * @version 1.0.0
 * @author RENVOX Team
 */

// ==========================================
// ✅ AUTHENTICATION & USER DATA
// ==========================================
const isLoggedIn = localStorage.getItem('renvoxUser') !== null;
const userName = localStorage.getItem('userName') || 'User';
const userClass = localStorage.getItem('userClass') || '';
let selectedDifficulty = 'easy';

// ==========================================
// 📊 SAMPLE DATA - SUBJECTS
// ==========================================
const allSubjects = [
    {
        name: 'C Programming',
        icon: '💻',
        color: '#3b82f6',
        progress: 65,
        accuracy: 78,
        questions: 125
    },
    {
        name: 'Data Structures',
        icon: '🔗',
        color: '#8b5cf6',
        progress: 52,
        accuracy: 72,
        questions: 98
    },
    {
        name: 'Mathematics',
        icon: '📐',
        color: '#10b981',
        progress: 88,
        accuracy: 85,
        questions: 156
    },
    {
        name: 'Physics',
        icon: '⚛️',
        color: '#ef4444',
        progress: 45,
        accuracy: 68,
        questions: 142
    },
    {
        name: 'Chemistry',
        icon: '🧪',
        color: '#f59e0b',
        progress: 70,
        accuracy: 80,
        questions: 118
    },
    {
        name: 'DBMS',
        icon: '🗄️',
        color: '#06b6d4',
        progress: 60,
        accuracy: 75,
        questions: 87
    },
];

// ==========================================
// 📝 SAMPLE DATA - RECENT ACTIVITY
// ==========================================
const recentActivities = [
    {
        icon: '📝',
        type: 'Chapter Test',
        subject: 'Variables & Data Types',
        score: '22/25',
        accuracy: '88%',
        time: '2 hours ago'
    },
    {
        icon: '🧩',
        type: 'Topic Practice',
        subject: 'Control Flow',
        score: '18/20',
        accuracy: '90%',
        time: '4 hours ago'
    },
    {
        icon: '🎯',
        type: 'Mock Test',
        subject: 'C Programming',
        score: '45/50',
        accuracy: '90%',
        time: 'Yesterday'
    },
    {
        icon: '📚',
        type: 'Chapter Test',
        subject: 'Arrays & Strings',
        score: '28/30',
        accuracy: '93%',
        time: '2 days ago'
    },
];

// ==========================================
// ⚠️ SAMPLE DATA - WEAK AREAS
// ==========================================
const weakAreas = [
    { topic: 'Pointers & Memory Management', accuracy: 45 },
    { topic: 'Dynamic Memory Allocation', accuracy: 52 },
    { topic: 'File Handling', accuracy: 58 },
    { topic: 'LinkedLists Implementation', accuracy: 62 },
];

// ==========================================
// 🎯 INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    // Show content for all users
    document.getElementById('practiceContent').style.display = 'block';
    document.getElementById('loginPrompt').style.display = 'none';

    // Load all sections
    setupNavbar();

    setTimeout(() => {
        loadSubjectsList();
        loadRecentActivity();
        loadWeakAreas();
    }, 100);

    // Setup scroll effects
    setupScrollEffects();
});

// ==========================================
// 🔧 SETUP NAVBAR
// ==========================================
/**
 * Configures navbar buttons and user information display
 * Shows user button if logged in, otherwise shows login/signup links
 */
function setupNavbar() {
    const navButtons = document.getElementById('navButtons');

    if (isLoggedIn) {
        navButtons.innerHTML = `
            <button class="btn-user">
                <i class="fas fa-user-circle"></i>
                <span>${userName}</span>
            </button>
            <button class="btn-user" style="background-color: #fee2e2; color: #dc2626;" onclick="logout()">
                Logout
            </button>
        `;
    } else {
        navButtons.innerHTML = `
            <a href="signup.html" class="btn-user">Login</a>
            <a href="signup.html" class="btn-user" style="background-color: var(--primary-color); color: white;">
                Sign Up
            </a>
        `;
    }
}

// ==========================================
// 📚 LOAD SUBJECT-WISE PRACTICE LIST
// ==========================================
/**
 * Renders auto-filtered subject cards based on user's class
 * Shows progress bar, accuracy %, and practice button for each subject
 */
function loadSubjectsList() {
    const html = allSubjects.map(s => `
        <div class="subject-practice-card">
            <div class="subject-header">
                <div class="subject-icon">${s.icon}</div>
                <div class="subject-name">${s.name}</div>
            </div>
            <span class="accuracy-badge">Accuracy: ${s.accuracy}%</span>
            <div class="progress-section">
                <div class="progress-label">
                    <span>Progress</span>
                    <span>${s.progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${s.progress}%; background: linear-gradient(90deg, ${s.color}, #10b981);"></div>
                </div>
            </div>
            <button class="btn-practice-now" onclick="practiceSubject('${s.name}')">
                Practice Now
            </button>
        </div>
    `).join('');

    const container = document.getElementById('subjectsList');
    if (container) {
        container.innerHTML = html;
    }
}

// ==========================================
// 📋 LOAD RECENT ACTIVITY
// ==========================================
/**
 * Displays list of recent practice attempts
 * Shows: Chapter tests, topic practice, mock tests
 * Helps user with revision and tracking
 */
function loadRecentActivity() {
    const html = recentActivities.map((a, index) => `
        <div class="activity-item" style="animation: slideIn 0.3s ease ${index * 0.1}s backwards;">
            <div class="activity-icon">${a.icon}</div>
            <div class="activity-details">
                <div class="activity-title">${a.type} - ${a.subject}</div>
                <div class="activity-meta">${a.time}</div>
            </div>
            <div class="activity-stat">
                <div>${a.score}</div>
                <div class="activity-stat-label">${a.accuracy}</div>
            </div>
        </div>
    `).join('');

    const container = document.getElementById('activityList');
    if (container) {
        container.innerHTML = html;
    }
}

// ==========================================
// ⚠️ LOAD WEAK AREAS
// ==========================================
/**
 * Shows topics where user needs improvement
 * Compares current accuracy with target (75%)
 * Provides focused practice button for each weak area
 */
function loadWeakAreas() {
    const html = weakAreas.map((w, index) => `
        <div class="weak-area-card" style="animation: slideIn 0.3s ease ${index * 0.1}s backwards;">
            <div class="weak-area-info">
                <div class="weak-area-topic">${w.topic}</div>
                <div class="weak-area-accuracy">
                    Current Accuracy: <strong>${w.accuracy}%</strong> • Target: 75%
                </div>
            </div>
            <button class="btn-practice-weak" onclick="practiceWeakArea('${w.topic}')">
                Practice Again
            </button>
        </div>
    `).join('');

    const container = document.getElementById('weakAreasList');
    if (container) {
        container.innerHTML = html;
    }
}

// ==========================================
// 🎯 PRACTICE FUNCTIONS
// ==========================================

/**
 * Handles difficulty level selection
 * Updates visual state and question count
 * 
 * @param {HTMLElement} btn - The clicked button
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 */
function selectDifficulty(btn, difficulty) {
    document.querySelectorAll('.difficulty-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
    selectedDifficulty = difficulty;

    // Update question count
    const counts = { easy: 15, medium: 20, hard: 25 };
    const qCount = document.getElementById('topicQCount');
    if (qCount) {
        qCount.textContent = counts[difficulty];
    }
}

/**
 * Starts topic-wise practice
 * Validates topic selection before proceeding
 * 
 * @fires Topic practice starts with selected difficulty and topic
 */
function startTopicPractice() {
    const topic = document.getElementById('topicSelect');
    if (!topic || topic.value === 'Select a topic...') {
        showAlert('Please select a topic first!');
        return;
    }

    showAlert(
        `Starting ${selectedDifficulty.toUpperCase()} practice on: ${topic.value}\n\n` +
        'Redirecting to practice interface...',
        'success'
    );
}

/**
 * Starts chapter test
 * Validates chapter selection before proceeding
 * 
 * @fires Chapter test interface opens
 */
function startChapterTest() {
    const chapter = document.getElementById('chapterSelect');
    if (!chapter || chapter.value === 'Select a chapter...') {
        showAlert('Please select a chapter first!');
        return;
    }

    showAlert(
        `Starting Chapter Test: ${chapter.value}\n\n` +
        '⏱️ 30 minutes | 25-30 Questions\n\n' +
        'Redirecting to test interface...',
        'success'
    );
}

/**
 * Attempts mock test
 * Validates mock test selection before proceeding
 * 
 * @fires Mock test interface opens with exam format
 */
function attemptMockTest() {
    const mock = document.getElementById('mockSelect');
    if (!mock || mock.value === 'Select a mock test...') {
        showAlert('Please select a mock test first!');
        return;
    }

    showAlert(
        `Starting Mock Test: ${mock.value}\n\n` +
        '📋 Real Exam Format | ⏱️ 90 Minutes\n\n' +
        'Redirecting to test interface...',
        'success'
    );
}

/**
 * Starts subject-wise practice
 * Navigates to subject-specific practice questions
 * 
 * @param {string} subject - Subject name
 */
function practiceSubject(subject) {
    showAlert(
        `Starting practice session for: ${subject}\n\n` +
        `Total Questions: ${allSubjects.find(s => s.name === subject)?.questions || 50}\n\n` +
        'Loading practice questions...',
        'success'
    );
}

/**
 * Starts focused practice for weak areas
 * Helps improve accuracy in specific topics
 * 
 * @param {string} topic - Topic name where user needs improvement
 */
function practiceWeakArea(topic) {
    showAlert(
        `Starting focused practice on: ${topic}\n\n` +
        'These questions are specifically designed to improve your weak areas.\n\n' +
        'Target Accuracy: 75%',
        'success'
    );
}

/**
 * Opens analytics/performance dashboard
 * Shows detailed statistics and progress tracking
 */
function viewAnalytics() {
    showAlert(
        `Opening Performance Analytics...\n\n` +
        '📊 View your detailed statistics\n' +
        '📈 Track improvement trends\n' +
        '🎯 Analyze weak and strong areas',
        'success'
    );
}

// ==========================================
// 🔐 AUTHENTICATION
// ==========================================

/**
 * Logs out current user
 * Clears localStorage and reloads page
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('renvoxUser');
        localStorage.removeItem('userName');
        localStorage.removeItem('userClass');
        window.location.reload();
    }
}

// ==========================================
// 🎨 UI UTILITIES
// ==========================================

/**
 * Displays alert message to user
 * 
 * @param {string} message - Alert message text
 * @param {string} type - 'success', 'error', or 'info'
 */
function showAlert(message, type = 'info') {
    alert(message);
}

/**
 * Scroll effects for navbar
 * Adds shadow and padding change on scroll
 */
function setupScrollEffects() {
    window.addEventListener('scroll', function () {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ==========================================
// 📱 RESPONSIVE DESIGN
// ==========================================

/**
 * Handles window resize events
 * Adjusts layout for different screen sizes
 */
window.addEventListener('resize', function () {
    // Can add responsive behavior here if needed
});

// ==========================================
// 🔄 EXPORT FOR EXTERNAL USE (if needed)
// ==========================================

// Example: window.practiceAPI = { startTopicPractice, startChapterTest, attemptMockTest }

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
