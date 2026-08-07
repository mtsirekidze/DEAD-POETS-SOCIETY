let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

function setCurrentUser(user) {
    currentUser = user;
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    else localStorage.removeItem('currentUser');
    renderAuthState();
}

async function registerUser(name, email, password) {
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || t('emailAlreadyRegistered') };
        setCurrentUser(data.user);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: t('networkError') };
    }
}

async function loginUser(email, password) {
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || t('invalidCredentials') };
        setCurrentUser(data.user);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: t('networkError') };
    }
}

function logout() {
    setCurrentUser(null);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

function resetAuthForm() {
    const form = document.getElementById('authForm');
    if (form) form.reset();
}

function updateAuthModeUI(mode) {
    const authTitle = document.getElementById('authTitle');
    const nameRow = document.getElementById('nameRow');
    const toggleAuth = document.getElementById('toggleAuth');
    const passwordInput = document.getElementById('authPassword');
    if (!authTitle || !nameRow || !toggleAuth) return;

    if (mode === 'signup') {
        authTitle.dataset.i18n = 'signup';
        authTitle.textContent = t('signup');
        nameRow.style.display = 'block';
        toggleAuth.dataset.i18n = 'switchToLogIn';
        toggleAuth.textContent = t('switchToLogIn');
        if (passwordInput) {
            passwordInput.placeholder = t('passwordPlaceholder');
            passwordInput.dataset.i18nPlaceholder = 'passwordPlaceholder';
        }
    } else {
        authTitle.dataset.i18n = 'login';
        authTitle.textContent = t('login');
        nameRow.style.display = 'none';
        toggleAuth.dataset.i18n = 'switchToSignUp';
        toggleAuth.textContent = t('switchToSignUp');
        if (passwordInput) {
            passwordInput.placeholder = t('loginPasswordPlaceholder');
            passwordInput.dataset.i18nPlaceholder = 'loginPasswordPlaceholder';
        }
    }
}

function openAuthModal(mode) {
    resetAuthForm();
    updateAuthModeUI(mode);
    openModal('authModal');
}

function renderAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const avatarBtn = document.getElementById('avatarBtn');
    const avatarImg = document.getElementById('avatarImg');
    const postBtn = document.getElementById('postButton');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!loginBtn || !signupBtn) return;

    if (currentUser) {
        if (postBtn) postBtn.style.display = 'none';
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (avatarBtn && avatarImg) {
            avatarBtn.style.display = 'inline-flex';
            if (currentUser.picture) {
                avatarImg.src = currentUser.picture;
                avatarImg.alt = currentUser.name || currentUser.email;
            } else {
                const initials = (currentUser.name || currentUser.email || 'U')
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='#f3f0f6'/><text x='50%' y='50%' font-size='36' text-anchor='middle' dominant-baseline='middle' fill='#7b6d80' font-family='Segoe UI, sans-serif'>${initials}</text></svg>`;
                avatarImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
            }
        }
    } else {
        if (postBtn) postBtn.style.display = 'none';
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (avatarBtn) avatarBtn.style.display = 'none';
    }
}

function initAuth() {
    renderAuthState();

    const authForm = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    if (!authForm || !loginBtn || !signupBtn) return;

    let mode = 'login';

    loginBtn.addEventListener('click', () => {
        mode = 'login';
        openAuthModal(mode);
    });

    signupBtn.addEventListener('click', () => {
        mode = 'signup';
        openAuthModal(mode);
    });

    const authClose = document.getElementById('authClose');
    if (authClose) authClose.addEventListener('click', () => closeModal('authModal'));

    const toggleAuth = document.getElementById('toggleAuth');
    if (toggleAuth) {
        toggleAuth.addEventListener('click', () => {
            mode = mode === 'login' ? 'signup' : 'login';
            updateAuthModeUI(mode);
        });
    }

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('authName').value.trim();
        const email = document.getElementById('authEmail').value.trim().toLowerCase();
        const password = document.getElementById('authPassword').value;

        if (mode === 'signup') {
            const res = await registerUser(name || email.split('@')[0], email, password);
            if (!res.ok) return alert(res.error);
        } else {
            const res = await loginUser(email, password);
            if (!res.ok) return alert(res.error);
        }

        resetAuthForm();
        closeModal('authModal');
        document.dispatchEvent(new CustomEvent('authchange'));
    });

    const avatarBtn = document.getElementById('avatarBtn');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', () => {
            if (!currentUser) openAuthModal('login');
            else window.location.href = 'profile.html';
        });
    }

    const logoutBtnEl = document.getElementById('logoutBtn');
    if (logoutBtnEl) {
        logoutBtnEl.addEventListener('click', () => {
            logout();
            document.dispatchEvent(new CustomEvent('authchange'));
        });
    }

    document.addEventListener('languagechange', () => updateAuthModeUI(mode));
}

document.addEventListener('DOMContentLoaded', initAuth);
