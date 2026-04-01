// ========== Auth State & Role Management ==========
let currentUser = null;
let currentUserRole = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserRole = userDoc.data().role;
        } else {
            // Create new user document
            await db.collection('users').doc(user.uid).set({
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentUserRole = 'user';
        }

        // Update UI elements that depend on auth state
        updateAuthUI();
        
        // Dispatch custom event for pages that need to know user role
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { user: currentUser, role: currentUserRole } 
        }));
    } else {
        currentUser = null;
        currentUserRole = null;
        updateAuthUI();
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null, role: null } }));
    }
});

function updateAuthUI() {
    // Elements that exist on multiple pages
    const loginBtn = document.getElementById('showLoginBtn');
    const userAvatar = document.getElementById('userAvatar');
    const submitNav = document.getElementById('submitNavBtn');
    const adminNav = document.getElementById('adminNavBtn');
    const mobileSubmit = document.getElementById('mobileSubmitNav');
    const mobileAdmin = document.getElementById('mobileAdminNav');
    const mobileAuthText = document.getElementById('mobileAuthText');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userAvatar) {
            userAvatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}&background=3b82f6&color=fff`;
            userAvatar.style.display = 'block';
        }
        if (submitNav && (currentUserRole === 'editor' || currentUserRole === 'admin')) {
            submitNav.style.display = 'inline';
        }
        if (mobileSubmit && (currentUserRole === 'editor' || currentUserRole === 'admin')) {
            mobileSubmit.style.display = 'block';
        }
        if (adminNav && currentUserRole === 'admin') {
            adminNav.style.display = 'inline';
        }
        if (mobileAdmin && currentUserRole === 'admin') {
            mobileAdmin.style.display = 'block';
        }
        if (mobileAuthText) {
            mobileAuthText.innerHTML = `<i class="fas fa-user"></i> ${currentUser.displayName || currentUser.email.split('@')[0]}`;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (userAvatar) userAvatar.style.display = 'none';
        if (submitNav) submitNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'none';
        if (mobileSubmit) mobileSubmit.style.display = 'none';
        if (mobileAdmin) mobileAdmin.style.display = 'none';
        if (mobileAuthText) mobileAuthText.innerHTML = 'පිවිසෙන්න';
    }
}

// Helper to check if user is admin (for frontend use)
function isAdmin() {
    return currentUserRole === 'admin';
}

function isEditor() {
    return currentUserRole === 'editor' || currentUserRole === 'admin';
}