/**
 * COURSENOVA Community JS
 * Handles Forum, Doubts, Chat, and Notifications
 */

const token = localStorage.getItem('coursenovaToken') || localStorage.getItem('coursenova_token');
const user = JSON.parse(localStorage.getItem('coursenovaUser') || localStorage.getItem('coursenova_user') || '{}');
const socket = typeof io !== 'undefined' ? io(window.COURSENOVA_API || undefined) : null;

let currentSection = 'feed';
let currentChannel = 'general';

document.addEventListener('DOMContentLoaded', () => {
    loadSection('feed');
    loadTrends();
    loadMiniLeaderboard();
    setupSocket();
    checkNotifications();
});

// ─── SECTION MANAGEMENT ───────────────────────────────────────

function loadSection(section) {
    currentSection = section;
    const container = document.getElementById('communityFeed');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    if (section === 'feed') fetchPosts();
    if (section === 'doubts') fetchDoubts();
    if (section === 'leaderboard') fetchFullLeaderboard();

    // UI Active state
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.innerText.toLowerCase().includes(section)) l.classList.add('active');
    });
}

// ─── POSTS / FORUM ──────────────────────────────────────────

async function fetchPosts() {
    try {
        const res = await fetch('/api/community/posts');
        const data = await res.json();
        if (data.ok) renderPosts(data.posts, 'communityFeed');
    } catch (e) { 
        console.error('Fetch posts error:', e);
        const container = document.getElementById('communityFeed');
        if (container) container.innerHTML = '<div class="no-content">Failed to load posts.</div>';
    }
}

function renderPosts(posts, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;
    if (!posts.length) {
        container.innerHTML = '<div class="no-content">No posts yet. Start the conversation!</div>';
        return;
    }

    container.innerHTML = posts.map(p => `
        <div class="post-card">
            <div class="post-header">
                <div class="user-info">
                    <div class="user-avatar"><img src="${p.userPicture || 'https://ui-avatars.com/api/?name=' + p.username}" alt=""></div>
                    <div class="post-meta">
                        <h4>${p.username}</h4>
                        <span>${new Date(p.createdAt).toLocaleDateString()} • ${p.category}</span>
                    </div>
                </div>
                <button class="btn-comm" style="padding:4px 12px; background:#f1f5f9; color:#64748b; font-size:12px;" onclick="followUser('${p.userId}')">Follow</button>
            </div>
            <div class="post-content">
                <h2>${p.title}</h2>
                <p>${p.content}</p>
            </div>
            <div class="post-footer">
                <div class="footer-action" onclick="likePost('${p._id}', this)">
                    <i class="fas fa-heart"></i> <span>${p.likesCount}</span>
                </div>
                <div class="footer-action" onclick="showComments('${p._id}')">
                    <i class="fas fa-comment"></i> <span>${p.commentsCount}</span>
                </div>
                <div class="footer-action">
                    <i class="fas fa-share"></i>
                </div>
            </div>
        </div>
    `).join('');
}

async function submitPost() {
    if (!token) return alert('Login to post!');
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;

    if (!title || !content) return alert('Title and Content are required');

    try {
        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, content, category })
        });
        const data = await res.json();
        if (data.ok) {
            closeModal('postModal');
            loadSection('feed');
        } else {
            alert(data.message || 'Failed to submit post');
        }
    } catch (e) {
        console.error('Submit post error:', e);
        alert('Network error while submitting post');
    }
}

async function likePost(postId, btn) {
    if (!token) return alert('Login to like!');
    try {
        const res = await fetch(`/api/community/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) {
            btn.querySelector('span').innerText = data.likesCount;
            btn.classList.toggle('liked', data.isLiked);
        }
    } catch (e) { console.error(e); }
}

// ─── DOUBTS ──────────────────────────────────────────────────

async function fetchDoubts() {
    try {
        const res = await fetch('/api/community/doubts');
        const data = await res.json();
        if (data.ok) renderDoubts(data.doubts);
    } catch (e) { console.error(e); }
}

function renderDoubts(doubts) {
    const container = document.getElementById('communityFeed');
    if (!container) return;
    container.innerHTML = doubts.map(d => `
        <div class="post-card">
            <div class="post-header">
                <div class="user-info">
                    <div class="user-avatar"><img src="${d.userPicture || 'https://ui-avatars.com/api/?name=' + d.username}"></div>
                    <div class="post-meta">
                        <h4>${d.username}</h4>
                        <span>${new Date(d.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                <span class="badge" style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:20px; font-size:12px;">Doubt</span>
            </div>
            <div class="post-content">
                <h2 style="font-size:1.2rem;">${d.question}</h2>
                ${d.details ? `<p>${d.details}</p>` : ''}
            </div>
            <div id="answers-${d._id}" style="margin-top:20px; padding-top:20px; border-top:1px dashed #e2e8f0;">
                ${d.answers.map(a => `
                    <div style="margin-bottom:15px; background:#f8fafc; padding:12px; border-radius:12px;">
                        <strong style="color:var(--comm-primary)">${a.username}${a.isInstructor ? ' <i class="fas fa-check-circle"></i>' : ''}</strong>: ${a.answer}
                    </div>
                `).join('')}
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <input type="text" id="ans-input-${d._id}" placeholder="Type your answer..." style="flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:8px;">
                    <button class="btn-comm btn-post" style="padding:8px 15px;" onclick="submitAnswer('${d._id}')">Answer</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function submitDoubt() {
    if (!token) return alert('Login to ask a doubt!');
    const question = document.getElementById('doubtQuestion').value;
    if (!question) return alert('Question is required');

    try {
        const res = await fetch('/api/community/doubts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ question })
        });
        const data = await res.json();
        if (data.ok) {
            closeModal('doubtModal');
            loadSection('doubts');
        }
    } catch (e) { console.error(e); }
}

async function submitAnswer(doubtId) {
    const answer = document.getElementById(`ans-input-${doubtId}`).value;
    if (!answer) return;
    if (!token) return alert('Login to answer!');

    try {
        const res = await fetch(`/api/community/doubts/${doubtId}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ answer })
        });
        if ((await res.json()).ok) loadSection('doubts');
    } catch (e) { console.error(e); }
}

// ─── LEADERBOARD & TRENDS ────────────────────────────────────

async function loadTrends() {
    try {
        const res = await fetch('/api/community/posts/trending');
        const data = await res.json();
        const trendList = document.getElementById('trendingList');
        if (data.ok && trendList) {
            trendList.innerHTML = data.posts.map(p => `
                <div class="trending-item">
                    <h5>${p.title}</h5>
                    <span>${p.likesCount} Likes • ${p.commentsCount} Comments</span>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function loadMiniLeaderboard() {
    try {
        const res = await fetch('/api/community/leaderboard');
        const data = await res.json();
        const miniL = document.getElementById('miniLeaderboard');
        if (data.ok && miniL) {
            miniL.innerHTML = data.entries.map((e, i) => `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                    <strong style="color:var(--comm-primary); width:20px;">${i + 1}</strong>
                    <div style="flex:1;">
                        <h5 style="margin:0;">${e.username}</h5>
                        <span style="font-size:11px; color:#64748b;">${e.points} Points • ${e.answers} Answers</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// ─── CHAT SOCKET ─────────────────────────────────────────────

function setupSocket() {
    if (!socket) return;
    socket.emit('join-room', 'general');

    socket.on('receive-message', (data) => {
        appendChatMessage(data);
    });

    socket.on('new_post', (post) => {
        if (currentSection === 'feed') fetchPosts();
        loadTrends();
    });

    socket.on('new_comment', (data) => {
        if (currentSection === 'feed') {
            const feedContainer = document.getElementById('communityFeed');
            if (feedContainer && feedContainer.innerHTML.includes('Discussion Thread')) {
                showComments(data.postId);
            } else {
                fetchPosts();
            }
        }
    });

    socket.on('like_update', (data) => {
        if (currentSection === 'feed') {
            const feedContainer = document.getElementById('communityFeed');
            if (feedContainer && !feedContainer.innerHTML.includes('Discussion Thread')) {
                fetchPosts();
            }
        }
    });

    socket.on('new_doubt', (doubt) => {
        if (currentSection === 'doubts') fetchDoubts();
    });

    socket.on('new_answer', (data) => {
        if (currentSection === 'doubts') fetchDoubts();
    });
}

function loadChannels() {
    const chatW = document.getElementById('chatWidget');
    if (chatW) chatW.classList.add('active');
    currentChannel = 'general';
    const currC = document.getElementById('currentChannel');
    if (currC) currC.innerText = '# ' + currentChannel;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !token) return;

    const msgData = {
        room: currentChannel,
        sender: user.fullName || 'Anonymous',
        text: text,
        avatar: user.picture || `https://ui-avatars.com/api/?name=${user.fullName || 'User'}`,
        ts: new Date()
    };

    socket.emit('send-message', msgData);
    input.value = '';
}

function appendChatMessage(data) {
    const container = document.getElementById('chatMsgs');
    if (!container) return;
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom:15px; display:flex; gap:10px;';
    div.innerHTML = `
        <img src="${data.avatar}" style="width:30px; height:30px; border-radius:50%;">
        <div>
            <div style="font-size:12px; font-weight:700;">${data.sender} <span style="font-weight:400; color:#94a3b8; font-size:10px;">${new Date(data.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div style="font-size:14px; color:#475569;">${data.text}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ─── AI ASSISTANT ──────────────────────────────────────────

function toggleAIChat() {
    const win = document.getElementById('aiChatWindow');
    if (win) win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
}

async function sendAICommMessage() {
    const input = document.getElementById('aiInput');
    const text = input.value.trim();
    if (!text) return;

    appendAIMessage(text, 'user');
    input.value = '';

    const typing = document.createElement('div');
    typing.style.cssText = 'background:white; border:1px solid #e2e8f0; padding:10px; border-radius:12px; max-width:100px; font-size:12px; margin-bottom:10px; color:#94a3b8; font-style:italic;';
    typing.innerText = 'AI is thinking...';
    const msgs = document.getElementById('aiMsgs');
    if (msgs) msgs.appendChild(typing);

    try {
        const res = await fetch('/api/community-ai/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        typing.remove();
        if (data.ok) appendAIMessage(data.reply, 'bot');
    } catch (e) {
        typing.remove();
        console.error(e);
    }
}

function appendAIMessage(text, side) {
    const container = document.getElementById('aiMsgs');
    if (!container) return;
    const div = document.createElement('div');
    div.style.cssText = `margin-bottom:10px; padding:10px; border-radius:12px; max-width:85%; font-size:14px; ${side === 'user' ? 'margin-left:auto; background:var(--comm-primary); color:white;' : 'background:white; border:1px solid #e2e8f0;'}`;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ─── UI UTILS ────────────────────────────────────────────────

function openModal(id) {
    if (!token) return alert('Please Login');
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}
function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active'); 
}

async function checkNotifications() {
    if (!token) return;
    try {
        const res = await fetch('/api/community/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const badge = document.getElementById('notifBadge');
        if (data.ok && badge) {
            const unread = data.notifications.filter(n => !n.isRead).length;
            if (unread > 0) {
                badge.innerText = unread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { }
}

async function fetchFullLeaderboard() {
    const container = document.getElementById('communityFeed');
    if (!container) return;
    try {
        const res = await fetch('/api/community/leaderboard');
        const data = await res.json();
        if (data.ok) {
            container.innerHTML = `
                <div class="section-card" style="padding: 30px; background: white; border-radius: 20px; box-shadow: var(--comm-shadow);">
                    <h2 style="margin-bottom: 25px; text-align: center;"><i class="fas fa-trophy" style="color:#fbbf24"></i> Community Leaderboard</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid #f1f5f9;">
                                <th style="padding: 12px;">Rank</th>
                                <th style="padding: 12px;">Contributor</th>
                                <th style="padding: 12px;">Points</th>
                                <th style="padding: 12px;">Posts</th>
                                <th style="padding: 12px;">Answers</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.entries.map((e, i) => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 15px 12px;"><strong>#${i + 1}</strong></td>
                                    <td style="padding: 15px 12px;">
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            <div class="user-avatar" style="width:30px; height:30px;"><img src="https://ui-avatars.com/api/?name=${e.username}"></div>
                                            <span>${e.username}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 15px 12px;"><strong>${e.points}</strong></td>
                                    <td style="padding: 15px 12px;">${e.posts || 0}</td>
                                    <td style="padding: 15px 12px;">${e.answers || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = '<div class="error">Failed to load leaderboard.</div>';
    }
}

async function showComments(postId) {
    const feed = document.getElementById('communityFeed');
    if (!feed) return;
    try {
        const res = await fetch(`/api/community/posts/${postId}/comments`);
        const data = await res.json();
        if (data.ok) {
            const commentsHtml = data.comments.map(c => `
                <div style="margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; border-left: 4px solid var(--comm-primary);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong>${c.username}</strong>
                        <span style="font-size:11px; color:#64748b;">${new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p style="margin:0; font-size:14px; color:#334155;">${c.text}</p>
                </div>
            `).join('');

            const inputHtml = `
                <div style="margin-top: 25px; padding-top: 25px; border-top: 2px dashed #e2e8f0;">
                    <h4>Leave a Comment</h4>
                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <textarea id="comm-input-${postId}" placeholder="Write your thoughts..." style="flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:12px; resize:none;"></textarea>
                        <button class="btn-comm btn-post" style="padding:10px 20px; align-self: flex-end;" onclick="submitComment('${postId}')">Post</button>
                    </div>
                    <button class="btn-comm" style="margin-top:20px; background:#f1f5f9; color:#64748b;" onclick="loadSection('feed')">← Back to Feed</button>
                </div>
            `;

            feed.innerHTML = `
                <div class="post-card">
                    <h3 style="margin-bottom:20px; color:var(--comm-primary);">Discussion Thread</h3>
                    ${data.comments.length ? commentsHtml : '<p style="color:#64748b; font-style:italic;">No comments yet. Be the first to comment!</p>'}
                    ${inputHtml}
                </div>
            `;
        }
    } catch (e) { console.error(e); }
}

async function submitComment(postId) {
    const textEl = document.getElementById(`comm-input-${postId}`);
    const text = textEl ? textEl.value : '';
    if (!text || !token) return alert('Please login to comment!');

    try {
        const res = await fetch(`/api/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.ok) {
            showComments(postId);
        }
    } catch (e) { console.error(e); }
}

async function followUser(userId) {
    if (!token) return alert('Login to follow!');
    try {
        const res = await fetch(`/api/community/follow/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.ok) alert(data.following ? 'Following!' : 'Unfollowed');
    } catch (e) { }
}
