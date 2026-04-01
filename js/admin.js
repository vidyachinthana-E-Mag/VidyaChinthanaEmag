// ========== Admin Panel Logic ==========
let currentCommentId = null;

// Redirect if not admin
window.addEventListener('authStateChanged', (e) => {
    if (!e.detail.user || e.detail.role !== 'admin') {
        window.location.href = 'index.html';
    } else {
        loadAdminDashboard();
    }
});

// Tab switching
document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        document.querySelectorAll('#dashboardTab, #pendingTab, #articlesTab, #usersTab, #commentsTab, #aiTab').forEach(div => div.style.display = 'none');
        document.getElementById(tabName + 'Tab').style.display = 'block';
        if (tabName === 'pending') loadPendingArticles();
        if (tabName === 'articles') loadAllArticles();
        if (tabName === 'users') loadAllUsers();
        if (tabName === 'comments') loadAllComments();
    });
});

// Dashboard stats
async function loadAdminDashboard() {
    const articlesSnap = await db.collection('articles').get();
    const pendingSnap = await db.collection('articles').where('status', '==', 'pending').get();
    const usersSnap = await db.collection('users').get();
    const commentsSnap = await db.collectionGroup('comments').get();

    document.getElementById('adminStats').innerHTML = `
        <div class="stat-card"><div class="number">${articlesSnap.size}</div><div>ලිපි</div></div>
        <div class="stat-card"><div class="number">${pendingSnap.size}</div><div>අනුමැතිය සඳහා</div></div>
        <div class="stat-card"><div class="number">${usersSnap.size}</div><div>පරිශීලකයින්</div></div>
        <div class="stat-card"><div class="number">${commentsSnap.size}</div><div>අදහස්</div></div>
    `;

    const recent = await db.collection('articles').orderBy('submittedAt', 'desc').limit(5).get();
    let html = '';
    recent.forEach(doc => {
        const a = doc.data();
        html += `<div style="padding:8px 0; border-bottom:1px solid var(--border);">
                    <strong>${escapeHtml(a.title)}</strong><br>
                    <small>${a.authorName} | ${formatDate(a.submittedAt)} | ${a.status}</small>
                 </div>`;
    });
    document.getElementById('recentActivity').innerHTML = html;
}

// Pending articles
async function loadPendingArticles() {
    const snapshot = await db.collection('articles').where('status', '==', 'pending').orderBy('submittedAt', 'desc').get();
    if (snapshot.empty) {
        document.getElementById('pendingList').innerHTML = '<p>අනුමැතිය සඳහා ලිපි නොමැත</p>';
        return;
    }
    let html = '<table><thead><tr><th>සිරස්තලය</th><th>කර්තෘ</th><th>දිනය</th><th>ක්‍රියා</th></tr></thead><tbody>';
    snapshot.forEach(doc => {
        const a = doc.data();
        html += `<tr>
                    <td><strong>${escapeHtml(a.title)}</strong><br><small>${a.category || ''}</small></td>
                    <td>${escapeHtml(a.authorName)}</td>
                    <td>${formatDate(a.submittedAt)}</td>
                    <td><button class="btn-success" onclick="approveArticle('${doc.id}')">අනුමත කරන්න</button> <button class="btn-danger" onclick="rejectArticle('${doc.id}')">ප්‍රතික්ෂේප කරන්න</button></td>
                 </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('pendingList').innerHTML = html;
}

// All articles
async function loadAllArticles() {
    const snapshot = await db.collection('articles').orderBy('submittedAt', 'desc').get();
    if (snapshot.empty) {
        document.getElementById('allArticlesList').innerHTML = '<p>ලිපි නොමැත</p>';
        return;
    }
    let html = '<table><thead><tr><th>සිරස්තලය</th><th>කර්තෘ</th><th>තත්වය</th><th>දිනය</th></tr></thead><tbody>';
    snapshot.forEach(doc => {
        const a = doc.data();
        html += `<tr>
                    <td>${escapeHtml(a.title)}</td>
                    <td>${escapeHtml(a.authorName)}</td>
                    <td>${a.status}</td>
                    <td>${formatDate(a.submittedAt)}</td>
                 </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('allArticlesList').innerHTML = html;
}

// Users management
async function loadAllUsers() {
    const snapshot = await db.collection('users').get();
    let html = '<table><thead><tr><th>නම</th><th>ඊමේල්</th><th>භූමිකාව</th><th>ක්‍රියා</th></tr></thead><tbody>';
    snapshot.forEach(doc => {
        const u = doc.data();
        html += `<tr>
                    <td>${escapeHtml(u.name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><select onchange="changeUserRole('${doc.id}', this.value)">
                            <option value="user" ${u.role === 'user' ? 'selected' : ''}>පාඨකයා</option>
                            <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>කතෘ</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>පරිපාලක</option>
                        </select>
                    </td>
                    <td><button class="btn-danger" onclick="deleteUser('${doc.id}')">මකන්න</button></td>
                 </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('usersList').innerHTML = html;
}

window.changeUserRole = async (userId, newRole) => {
    try {
        await db.collection('users').doc(userId).update({ role: newRole });
        showToast('භූමිකාව වෙනස් කරන ලදී');
        loadAllUsers();
    } catch (e) {
        showToast('දෝෂයක්', 'error');
    }
};

window.deleteUser = async (userId) => {
    if (confirm('මෙම පරිශීලකයා මකන්න?')) {
        try {
            await db.collection('users').doc(userId).delete();
            showToast('මකන ලදී');
            loadAllUsers();
        } catch (e) {
            showToast('දෝෂයක්', 'error');
        }
    }
};

// Comments
async function loadAllComments() {
    const snapshot = await db.collectionGroup('comments').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
        document.getElementById('commentsListAdmin').innerHTML = '<p>අදහස් නොමැත</p>';
        return;
    }
    let html = '';
    snapshot.forEach(doc => {
        const c = doc.data();
        html += `<div style="padding:12px; border-bottom:1px solid var(--border);">
                    <strong>${escapeHtml(c.userName)}</strong> <small>${formatDate(c.createdAt)}</small>
                    <p>${escapeHtml(c.text)}</p>
                    ${c.reply ? `<p><strong>පිළිතුර:</strong> ${escapeHtml(c.reply)}</p>` : ''}
                    <button class="btn-outline" onclick="openReplyModalAdmin('${doc.ref.path}')">පිළිතුරු දෙන්න</button>
                 </div>`;
    });
    document.getElementById('commentsListAdmin').innerHTML = html;
}

window.openReplyModalAdmin = (path) => {
    currentCommentId = path;
    document.getElementById('replyModal').classList.add('active');
};

document.getElementById('submitReplyBtn').addEventListener('click', async () => {
    const reply = document.getElementById('replyText').value.trim();
    if (!reply || !currentCommentId) return;
    try {
        await db.doc(currentCommentId).update({
            reply: reply,
            repliedAt: firebase.firestore.FieldValue.serverTimestamp(),
            repliedBy: currentUser.uid
        });
        showToast('පිළිතුරු ලබා දෙන ලදී');
        document.getElementById('replyModal').classList.remove('active');
        document.getElementById('replyText').value = '';
        loadAllComments();
    } catch (e) {
        showToast('දෝෂයක්', 'error');
    }
});

// Approve / Reject
window.approveArticle = async (id) => {
    try {
        await db.collection('articles').doc(id).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('ලිපිය අනුමත කරන ලදී');
        loadPendingArticles();
        loadAdminDashboard();
    } catch (e) {
        showToast('දෝෂයක්', 'error');
    }
};

window.rejectArticle = async (id) => {
    if (confirm('මෙම ලිපිය ප්‍රතික්ෂේප කරන්න?')) {
        try {
            await db.collection('articles').doc(id).delete();
            showToast('ලිපිය ප්‍රතික්ෂේප කරන ලදී');
            loadPendingArticles();
            loadAdminDashboard();
        } catch (e) {
            showToast('දෝෂයක්', 'error');
        }
    }
};

// AI Issue Generator
document.getElementById('generateIssueBtn').addEventListener('click', async () => {
    const btn = document.getElementById('generateIssueBtn');
    btn.disabled = true;
    btn.textContent = 'නිර්මාණය වෙමින්...';

    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const snapshot = await db.collection('articles')
            .where('status', '==', 'approved')
            .where('submittedAt', '>=', weekAgo)
            .get();

        if (snapshot.empty) {
            document.getElementById('aiResult').innerHTML = '<p>මෙම සතියේ අනුමත ලිපි නොමැත</p>';
            btn.disabled = false;
            btn.textContent = '✨ කලාපය නිර්මාණය කරන්න';
            return;
        }

        const articles = [];
        snapshot.forEach(doc => articles.push({ id: doc.id, ...doc.data() }));

        const issueNumber = `issue_${new Date().toISOString().split('T')[0]}`;
        await db.collection('issues').doc(issueNumber).set({
            title: `සතිපතා කලාපය - ${new Date().toLocaleDateString('si-LK')}`,
            articleIds: articles.map(a => a.id),
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            published: true,
            layout: {
                order: articles.map((_, i) => i),
                colorPalette: ['#3b82f6', '#f59e0b', '#10b981']
            }
        });

        for (const a of articles) {
            await db.collection('articles').doc(a.id).update({
                status: 'published',
                publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                issueNumber: issueNumber
            });
        }

        document.getElementById('aiResult').innerHTML = `
            <div style="padding:16px; background:#10b98110; border-radius:8px;">
                ✅ කලාපය සාර්ථකව නිර්මාණය විය!<br>
                කලාප අංකය: ${issueNumber}<br>
                ලිපි ගණන: ${articles.length}
            </div>
        `;
        showToast('කලාපය සාර්ථකව නිර්මාණය විය');
        loadAdminDashboard();
    } catch (e) {
        console.error(e);
        document.getElementById('aiResult').innerHTML = '<p style="color:#ef4444;">දෝෂයක් ඇතිවිය</p>';
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ කලාපය නිර්මාණය කරන්න';
    }
});

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('si-LK', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = msg;
    toast.style.borderLeftColor = type === 'error' ? '#ef4444' : '#10b981';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Theme and year
document.getElementById('currentYear').innerText = new Date().getFullYear();
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
}
document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
});
initTheme();

// Avatar
window.addEventListener('authStateChanged', (e) => {
    if (e.detail.user) {
        const avatar = document.getElementById('userAvatar');
        avatar.src = e.detail.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.detail.user.email)}&background=3b82f6&color=fff`;
        avatar.style.display = 'block';
    }
});