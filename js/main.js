// ========== Home Page Logic ==========
let allArticles = [];

// Load published articles
async function loadArticles() {
    try {
        const snapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(6)
            .get();

        if (snapshot.empty) {
            document.getElementById('articlesGrid').innerHTML = '<div class="loading">ලිපි නොමැත</div>';
            return;
        }

        allArticles = [];
        let html = '';
        snapshot.forEach(doc => {
            const a = { id: doc.id, ...doc.data() };
            allArticles.push(a);
            html += `
                <div class="article-card" data-id="${a.id}">
                    <img src="${a.featuredImage || 'https://picsum.photos/id/0/400/200'}" class="article-image">
                    <div class="article-content">
                        <span class="article-category">${a.category || 'විද්‍යාව'}</span>
                        <h3 class="article-title">${escapeHtml(a.title)}</h3>
                        <div class="article-meta"><i class="fas fa-user"></i> ${escapeHtml(a.authorName)} | <i class="fas fa-calendar"></i> ${formatDate(a.publishedAt)}</div>
                        <p class="article-excerpt">${escapeHtml(a.excerpt || a.content.substring(0, 120))}...</p>
                    </div>
                </div>
            `;
        });
        document.getElementById('articlesGrid').innerHTML = html;

        document.querySelectorAll('.article-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const article = allArticles.find(a => a.id === id);
                if (article) openArticleModal(article);
            });
        });
    } catch (error) {
        console.error(error);
    }
}

// Load creators for sidebar
async function loadCreators() {
    try {
        const snapshot = await db.collection('users').where('role', 'in', ['editor', 'admin']).get();
        let html = '';
        snapshot.forEach(doc => {
            const u = doc.data();
            html += `
                <div class="creator-item">
                    <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=f59e0b&color=fff`}" class="creator-avatar">
                    <div><strong>${escapeHtml(u.name)}</strong><br><small>${u.role === 'admin' ? 'ප්‍රධාන කර්තෘ' : 'කතෘ'}</small></div>
                </div>
            `;
        });
        document.getElementById('creatorsList').innerHTML = html || '<p>නිර්මාණකරුවන් නොමැත</p>';
    } catch (error) {
        console.error(error);
    }
}

// Load popular articles
async function loadPopular() {
    try {
        const snapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .orderBy('views', 'desc')
            .limit(5)
            .get();
        let html = '<div style="font-size:0.9rem;">';
        snapshot.forEach(doc => {
            const a = doc.data();
            html += `<div style="margin-bottom:12px; cursor:pointer;" onclick="openArticleById('${doc.id}')">
                        <strong>${escapeHtml(a.title.substring(0, 50))}</strong>
                        <div style="font-size:0.7rem;">👁️ ${a.views || 0} කියවීම්</div>
                     </div>`;
        });
        html += '</div>';
        document.getElementById('popularArticles').innerHTML = html || '<p>දත්ත නොමැත</p>';
    } catch (error) {
        console.error(error);
    }
}

// Open article by ID
window.openArticleById = async function(id) {
    const doc = await db.collection('articles').doc(id).get();
    if (doc.exists) openArticleModal({ id: doc.id, ...doc.data() });
};

// Article modal
function openArticleModal(article) {
    const modalContent = document.getElementById('modalArticleContent');
    const markedHtml = marked.parse(article.content);
    modalContent.innerHTML = `
        <div><span class="article-category">${article.category || 'විද්‍යාව'}</span></div>
        <h2>${escapeHtml(article.title)}</h2>
        <div style="color:var(--text-muted); margin-bottom:1rem;"><i class="fas fa-user"></i> ${escapeHtml(article.authorName)} | <i class="fas fa-calendar"></i> ${formatDate(article.publishedAt)}</div>
        <img src="${article.featuredImage || 'https://picsum.photos/id/0/800/400'}" style="width:100%; border-radius:1rem; margin-bottom:1.5rem;">
        <div>${markedHtml}</div>
        <div style="margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border); display:flex; gap:1rem;">
            <button class="icon-btn" id="likeBtn"><i class="far fa-heart"></i> <span id="likeCount">${article.likes || 0}</span></button>
            <button class="icon-btn" id="saveBtn"><i class="far fa-bookmark"></i> සුරකින්න</button>
            <button class="icon-btn" id="commentBtn"><i class="far fa-comment"></i> අදහස්</button>
        </div>
        <div id="commentsSection" style="margin-top:1.5rem; display:none;">
            <h4>අදහස්</h4>
            <div id="commentsList"></div>
            ${currentUser ? `<textarea id="commentInput" placeholder="ඔබගේ අදහස..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--bg-primary); margin-top:10px;"></textarea><button id="submitCommentBtn" class="btn-primary" style="margin-top:10px;">අදහස පළ කරන්න</button>` : '<p>අදහස් දැක්වීමට පිවිසෙන්න</p>'}
        </div>
    `;

    loadComments(article.id);

    document.getElementById('likeBtn').addEventListener('click', () => {
        if (!currentUser) showToast('පළමුව පිවිසෙන්න');
        else toggleLike(article.id);
    });
    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!currentUser) showToast('පළමුව පිවිසෙන්න');
        else toggleSave(article.id);
    });
    document.getElementById('commentBtn').addEventListener('click', () => {
        const sec = document.getElementById('commentsSection');
        sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    });
    if (currentUser) {
        document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
            const inp = document.getElementById('commentInput');
            if (inp.value.trim()) submitComment(article.id, inp.value.trim());
        });
    }

    document.getElementById('articleModal').classList.add('active');
}

// Load comments for modal
async function loadComments(articleId) {
    try {
        const snapshot = await db.collection('articles').doc(articleId).collection('comments').orderBy('createdAt', 'desc').get();
        const container = document.getElementById('commentsList');
        if (snapshot.empty) {
            container.innerHTML = '<p>තවම අදහස් නොමැත</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const c = doc.data();
            html += `
                <div style="padding:12px; border-bottom:1px solid var(--border);">
                    <strong>${escapeHtml(c.userName)}</strong> <span style="font-size:0.7rem;">${formatDate(c.createdAt)}</span>
                    <p>${escapeHtml(c.text)}</p>
                    ${c.reply ? `<div style="margin-left:20px; margin-top:8px; padding:8px; background:var(--bg-secondary); border-radius:8px;"><strong>📌 පරිපාලක:</strong><p>${escapeHtml(c.reply)}</p></div>` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}

// Submit comment
async function submitComment(articleId, text) {
    if (!currentUser) return;
    try {
        await db.collection('articles').doc(articleId).collection('comments').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            reply: null
        });
        showToast('අදහස සාර්ථකව එකතු විය');
        loadComments(articleId);
        await db.collection('articles').doc(articleId).update({
            comments: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error(error);
        showToast('දෝෂයක් ඇතිවිය', 'error');
    }
}

// Toggle like
async function toggleLike(articleId) {
    const likeRef = db.collection('likes').doc(`${articleId}_${currentUser.uid}`);
    const doc = await likeRef.get();
    if (doc.exists) {
        await likeRef.delete();
        await db.collection('articles').doc(articleId).update({ likes: firebase.firestore.FieldValue.increment(-1) });
        document.getElementById('likeCount').innerText = parseInt(document.getElementById('likeCount').innerText) - 1;
    } else {
        await likeRef.set({ articleId, userId: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection('articles').doc(articleId).update({ likes: firebase.firestore.FieldValue.increment(1) });
        document.getElementById('likeCount').innerText = parseInt(document.getElementById('likeCount').innerText) + 1;
    }
}

// Toggle save
async function toggleSave(articleId) {
    const saveRef = db.collection('users').doc(currentUser.uid).collection('saved').doc(articleId);
    if ((await saveRef.get()).exists) {
        await saveRef.delete();
        showToast('සුරැකීම ඉවත් කරන ලදී');
    } else {
        await saveRef.set({ articleId, savedAt: firebase.firestore.FieldValue.serverTimestamp() });
        showToast('ලිපිය සුරකින ලදී');
    }
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function formatDate(timestamp) {
    if (!timestamp) return 'මෑතකදී';
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

// Page navigation (archive, creators)
document.getElementById('viewAllBtn').addEventListener('click', () => {
    window.location.href = '#archive';
    // Simple archive modal implementation can be added, but for now just show all articles
    loadAllArticlesForArchive();
});

async function loadAllArticlesForArchive() {
    const snapshot = await db.collection('articles').where('status', '==', 'published').orderBy('publishedAt', 'desc').get();
    let html = '';
    snapshot.forEach(doc => {
        const a = doc.data();
        html += `<div class="article-card" data-id="${doc.id}">
                    <img src="${a.featuredImage || 'https://picsum.photos/id/0/400/200'}" class="article-image">
                    <div class="article-content">
                        <span class="article-category">${a.category || 'විද්‍යාව'}</span>
                        <h3>${escapeHtml(a.title)}</h3>
                        <div class="article-meta">${escapeHtml(a.authorName)} | ${formatDate(a.publishedAt)}</div>
                    </div>
                 </div>`;
    });
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `<div class="modal-content"><span class="close-modal">&times;</span><h2>සියලු ලිපි</h2><div class="articles-grid">${html}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            openArticleById(id);
            modal.remove();
        });
    });
}

document.getElementById('archiveLink').addEventListener('click', (e) => {
    e.preventDefault();
    loadAllArticlesForArchive();
});
document.getElementById('mobileArchiveLink').addEventListener('click', (e) => {
    e.preventDefault();
    loadAllArticlesForArchive();
    document.getElementById('mobileMenu').classList.remove('active');
});
document.getElementById('creatorsLink').addEventListener('click', (e) => {
    e.preventDefault();
    showCreatorsModal();
});
document.getElementById('mobileCreatorsLink').addEventListener('click', (e) => {
    e.preventDefault();
    showCreatorsModal();
    document.getElementById('mobileMenu').classList.remove('active');
});

async function showCreatorsModal() {
    const snapshot = await db.collection('users').where('role', 'in', ['editor', 'admin']).get();
    let html = '<div style="display:grid; gap:20px;">';
    snapshot.forEach(doc => {
        const u = doc.data();
        html += `<div style="text-align:center; padding:20px; border:1px solid var(--border); border-radius:1rem;">
                    <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=f59e0b&color=fff`}" style="width:100px;height:100px;border-radius:50%;">
                    <h3>${escapeHtml(u.name)}</h3>
                    <p>${u.role === 'admin' ? 'ප්‍රධාන කර්තෘ' : 'කතෘ'}</p>
                 </div>`;
    });
    html += '</div>';
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `<div class="modal-content"><span class="close-modal">&times;</span><h2>නිර්මාණකරුවෝ</h2>${html}</div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Theme and UI
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

// Mobile menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileMenu.classList.toggle('active');
});
document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) mobileMenu.classList.remove('active');
});

// Dynamic Island shrink
const island = document.getElementById('dynamicIsland');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) island.classList.add('shrink');
    else island.classList.remove('shrink');
});

// Back to top
const backBtn = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) backBtn.classList.add('visible');
    else backBtn.classList.remove('visible');
});
backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Close modal
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('articleModal').classList.remove('active'));
});
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('articleModal')) document.getElementById('articleModal').classList.remove('active');
    if (e.target === document.getElementById('replyModal')) document.getElementById('replyModal').classList.remove('active');
});

// Initial load
loadArticles();
loadCreators();
loadPopular();
initTheme();
document.getElementById('currentYear').innerText = new Date().getFullYear();