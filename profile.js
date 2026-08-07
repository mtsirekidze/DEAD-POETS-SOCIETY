// Profile page script
(async function () {
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let poems = [];

    async function loadPoems() {
        try {
            const res = await fetch('/api/poems');
            const data = await res.json();
            if (data && data.poems) poems.splice(0, poems.length, ...data.poems);
        } catch (e) {
            console.error('Failed to load poems', e);
        }
    }

    if (!currentUser) {
        // not logged in -> redirect home
        window.location.href = 'index.html';
    }

    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileNameInput = document.getElementById('profileNameInput');
    const profileEmail = document.getElementById('profileEmail');
    const profileBioDisplay = document.getElementById('profileBioDisplay');
    const profileBioInput = document.getElementById('profileBioInput');
    const editProfileBtn = document.getElementById('editProfile');
    const saveProfileBtn = document.getElementById('saveProfile');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const profilePoems = document.getElementById('profilePoems');
    const statPosts = document.getElementById('statPosts');
    const statLikes = document.getElementById('statLikes');
    const avatarUpload = document.getElementById('avatarUpload');
    const changeAvatar = document.getElementById('changeAvatar');
    const postBtnProfile = document.getElementById('postBtnProfile');
    const logoutProfile = document.getElementById('logoutProfile');

    function saveCurrentUserLocal(u) { if (u) localStorage.setItem('currentUser', JSON.stringify(u)); else localStorage.removeItem('currentUser'); }

    function render() {
        // refresh currentUser from storage (in case updated elsewhere)
        currentUser = JSON.parse(localStorage.getItem('currentUser')) || currentUser;
        document.title = t('profileTitle');
        profileName.textContent = currentUser.name || currentUser.email;
        if (profileNameInput) profileNameInput.value = currentUser.name || '';
        // hide email from public view but keep in storage
        if (profileEmail) profileEmail.textContent = '';
        if (profileBioDisplay) profileBioDisplay.textContent = currentUser.bio || '';
        if (profileBioInput) profileBioInput.value = currentUser.bio || '';
        profileAvatar.src = currentUser.picture || (function () {
            const initials = (currentUser.name || currentUser.email || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='#f3f0f6'/><text x='50%' y='50%' font-size='36' text-anchor='middle' dominant-baseline='middle' fill='#7b6d80' font-family='Segoe UI, sans-serif'>${initials}</text></svg>`;
            return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        })();

        const mine = poems.filter(p => p.author === currentUser.name);
        statPosts.textContent = `${mine.length} ${t(mine.length === 1 ? 'postCount' : 'postsCount')}`;
        const likesTotal = mine.reduce((s, p) => s + (p.likes || 0), 0);
        statLikes.textContent = `${likesTotal} ${t('likes')}`;

        profilePoems.innerHTML = '';
        mine.forEach(p => {
            const card = document.createElement('article');
            card.className = 'poem-card';
            const created = p.createdAt ? formatDate(p.createdAt) : '';
            card.innerHTML = `
                <div class="meta-row"><span>${p.mood}</span><span>${p.author}</span><span>${created}</span></div>
                <div class="card-title-row">
                    <h4>${p.title}</h4>
                    <button class="ghost-button delete-btn" data-id="${p.id}">${t('delete')}</button>
                </div>
                <p>${p.excerpt}</p>
                <div class="card-actions"><span>❤ ${p.likes || 0}</span></div>
            `;
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (!confirm(t('deleteConfirmation'))) return;
                deletePoem(p.id);
            });
            card.addEventListener('click', () => { window.location.href = 'index.html'; localStorage.setItem('openPoemId', p.id); });
            profilePoems.appendChild(card);
        });
    }

    function formatDate(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString(); }

    async function deletePoem(poemId) {
        const index = poems.findIndex(p => p.id === poemId);
        if (index === -1) return;
        try {
            await fetch(`/api/poems/${poemId}`, { method: 'DELETE' });
        } catch (e) { console.error('Failed to delete', e); }
        poems.splice(index, 1);
        render();
    }

    changeAvatar.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function (ev) {
            const data = ev.target.result;
            if (!currentUser || !currentUser.id) return;
            try {
                const res = await fetch(`/api/users/${currentUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ picture: data }) });
                const rdata = await res.json();
                if (res.ok && rdata.user) {
                    currentUser = rdata.user;
                    saveCurrentUserLocal(currentUser);
                    profileAvatar.src = currentUser.picture;
                }
            } catch (err) { console.error('Failed to upload avatar', err); }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('postFormProfile').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('postTitleP').value.trim();
        const excerpt = document.getElementById('postExcerptP').value.trim();
        const mood = document.getElementById('postMoodP').value.trim() || 'other';
        const lines = document.getElementById('postLinesP').value.split('\n').map(l => l.trim()).filter(Boolean);
        try {
            const res = await fetch('/api/poems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, author: currentUser.name, mood, excerpt, description: excerpt, lines }) });
            const data = await res.json();
            if (res.ok && data.poem) poems.unshift(data.poem);
        } catch (err) { console.error('Failed to publish', err); }
        // clear form
        document.getElementById('postFormProfile').reset();
        // hide floating publish and update UI
        updatePublishVisibility();
        // rerender
        render();
    });

    function enterEditMode() {
        if (profileNameInput) profileNameInput.style.display = 'block';
        if (profileBioInput) profileBioInput.style.display = 'block';
        if (profileBioDisplay) profileBioDisplay.style.display = 'none';
        if (profileName) profileName.style.display = 'none';
        if (editProfileBtn) editProfileBtn.style.display = 'none';
        if (saveProfileBtn) saveProfileBtn.style.display = 'inline-block';
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
        if (profileNameInput) profileNameInput.focus();
    }

    function exitEditMode() {
        if (profileNameInput) profileNameInput.style.display = 'none';
        if (profileBioInput) profileBioInput.style.display = 'none';
        if (profileBioDisplay) profileBioDisplay.style.display = 'block';
        if (profileName) profileName.style.display = 'block';
        if (editProfileBtn) editProfileBtn.style.display = 'inline-block';
        if (saveProfileBtn) saveProfileBtn.style.display = 'none';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    }

    async function saveProfileChanges() {
        const newName = (profileNameInput && profileNameInput.value.trim()) || currentUser.name;
        const newBio = (profileBioInput && profileBioInput.value.trim()) || '';
        const oldName = currentUser.name;
        try {
            const res = await fetch(`/api/users/${currentUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, bio: newBio, oldName }) });
            const data = await res.json();
            if (res.ok && data.user) {
                currentUser = data.user;
                saveCurrentUserLocal(currentUser);
                await loadPoems();
                render();
            }
        } catch (err) { console.error('Failed to save profile', err); }
        exitEditMode();
    }

    if (editProfileBtn) editProfileBtn.addEventListener('click', enterEditMode);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => { if (profileNameInput) profileNameInput.value = currentUser.name || ''; if (profileBioInput) profileBioInput.value = currentUser.bio || ''; exitEditMode(); });
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfileChanges);

    // Inline publish button and live preview
    const postForm = document.getElementById('postFormProfile');
    const publishBtn = document.getElementById('publishProfileBtn');
    const previewContent = document.getElementById('previewContent');

    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" })[c]); }

    function updatePublishVisibility() {
        if (!postForm || !publishBtn) return;
        const title = document.getElementById('postTitleP').value.trim();
        const lines = document.getElementById('postLinesP').value.split('\n').map(l => l.trim()).filter(Boolean);
        const excerpt = document.getElementById('postExcerptP').value.trim();
        const mood = document.getElementById('postMoodP').value.trim() || 'other';
        publishBtn.disabled = !(title && lines.length);

        if (!title && !lines.length) {
            previewContent.innerHTML = t('fillFormPreview');
        } else {
            previewContent.innerHTML = `<div class="meta-row"><span>${escapeHtml(mood)}</span><span>${escapeHtml(currentUser.name)}</span></div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(excerpt)}</p><div>${lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')}</div>`;
        }
    }

    ['postTitleP', 'postLinesP', 'postExcerptP', 'postMoodP'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePublishVisibility);
    });

    if (publishBtn && postForm) {
        publishBtn.addEventListener('click', () => {
            if (postForm.requestSubmit) postForm.requestSubmit();
            else postForm.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    }

    translatePage();

    logoutProfile.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // support clicking the separate post button (same as form submit focus)
    postBtnProfile.addEventListener('click', () => { document.getElementById('postTitleP').focus(); });

    await loadPoems();
    render();

    document.addEventListener('languagechange', () => {
        render();
        translatePage();
    });
})();
