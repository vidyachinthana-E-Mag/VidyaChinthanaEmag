// Cloudinary settings - Replace with your values
const cloudName = 'YOUR_CLOUD_NAME';       // ඔබේ Cloudinary cloud name
const uploadPreset = 'VidyaChinthana';     // ඔබ හැදූ preset name

// Check if user is editor or admin
window.addEventListener('authStateChanged', (e) => {
    if (!e.detail.user || (e.detail.role !== 'editor' && e.detail.role !== 'admin')) {
        window.location.href = 'index.html';
    }
});

// Image upload button
document.getElementById('uploadImageBtn').addEventListener('click', () => {
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            sources: ['local', 'camera', 'url'],
            multiple: false,
            cropping: true,
            croppingAspectRatio: 16 / 9,
            showAdvancedOptions: false
        },
        (error, result) => {
            if (!error && result && result.event === 'success') {
                document.getElementById('articleImage').value = result.info.secure_url;
                showToast('පින්තූරය සාර්ථකව upload විය!');
            } else if (error) {
                showToast('Upload එක අසාර්ථකයි', 'error');
            }
        }
    );
    widget.open();
});

// Submit article
document.getElementById('submitArticleBtn').addEventListener('click', async () => {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const title = document.getElementById('articleTitle').value.trim();
    const category = document.getElementById('articleCategory').value;
    const tags = document.getElementById('articleTags').value.split(',').map(t => t.trim()).filter(t => t);
    const image = document.getElementById('articleImage').value.trim();
    const content = document.getElementById('articleContent').value.trim();
    const issue = document.getElementById('articleIssue').value.trim() || 'general';

    if (!title || !category || !content) {
        document.getElementById('articleSubmitMsg').innerHTML = '<span style="color:var(--accent-danger);">කරුණාකර අවශ්‍ය ක්ෂේත්‍ර පුරවන්න</span>';
        return;
    }

    try {
        await db.collection('articles').add({
            title: title,
            category: category,
            tags: tags,
            featuredImage: image || null,
            content: content,
            excerpt: content.substring(0, 200),
            issueNumber: issue,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            status: 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            likes: 0,
            comments: 0
        });

        document.getElementById('articleSubmitMsg').innerHTML = '<span style="color:var(--accent-success);">✅ ලිපිය සාර්ථකව එකතු විය! අනුමැතියෙන් පසු ප්‍රකාශයට පත් වේ.</span>';
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleContent').value = '';
        document.getElementById('articleTags').value = '';
        document.getElementById('articleImage').value = '';
    } catch (error) {
        console.error(error);
        document.getElementById('articleSubmitMsg').innerHTML = '<span style="color:var(--accent-danger);">දෝෂයක් ඇතිවිය. නැවත උත්සාහ කරන්න</span>';
    }
});

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

// Avatar update
window.addEventListener('authStateChanged', (e) => {
    if (e.detail.user) {
        const avatar = document.getElementById('userAvatar');
        avatar.src = e.detail.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.detail.user.email)}&background=3b82f6&color=fff`;
        avatar.style.display = 'block';
        document.getElementById('adminNavBtn').style.display = e.detail.role === 'admin' ? 'inline' : 'none';
    } else {
        window.location.href = 'index.html';
    }
});