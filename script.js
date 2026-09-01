// load poems from server
const poems = [];

async function loadPoems() {
    try {
        const res = await fetch('/api/poems');
        const data = await res.json();
        if (data && data.poems) {
            poems.splice(0, poems.length, ...data.poems);
        }
    } catch (e) {
        console.error('Failed to load poems', e);
    }
}

// ensure likes exist on all poems and normalize createdAt
poems.forEach((p) => {
    if (!('likes' in p)) p.likes = 0;
    if (!p.createdAt) p.createdAt = null;
});

let activeMood = 'all';
let searchTerm = '';
let selectedPoemId = null;

function getAvailableFilters() {
    return ['all', ...new Set(poems.map((poem) => poem.mood).filter(Boolean))];
}

const poemList = document.getElementById('poemList');
const moodFilters = document.getElementById('moodFilters');
const searchInput = document.getElementById('searchInput');
const resultsCount = document.getElementById('resultsCount');
const featuredTitle = document.getElementById('featuredTitle');
const featuredExcerpt = document.getElementById('featuredExcerpt');
const featuredButton = document.getElementById('featuredButton');
const detailTitle = document.getElementById('detailTitle');
const detailAuthor = document.getElementById('detailAuthor');
const detailDescription = document.getElementById('detailDescription');
const detailLines = document.getElementById('detailLines');

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser')) || null;
}

function toggleLike(poemId) {
    const p = poems.find((x) => x.id === poemId);
    if (!p) return;
    // optimistic UI
    p.likes = (p.likes || 0) + 1;
    render();
    fetch(`/api/poems/${poemId}/like`, { method: 'POST' }).catch((e) => console.error(e));
}


function getFilteredPoems() {
    const query = searchTerm.toLowerCase();
    return poems.filter((poem) => {
        const matchesMood = activeMood === 'all' || poem.mood === activeMood;
        const matchesSearch = [poem.title, poem.author, poem.mood, poem.excerpt]
            .join(' ')
            .toLowerCase()
            .includes(query);
        return matchesMood && matchesSearch;
    });
}

function renderFilters() {
    if (!moodFilters) return;
    moodFilters.innerHTML = '';
    const filters = getAvailableFilters();
    filters.forEach((filter) => {
        const button = document.createElement('button');
        button.className = `pill ${activeMood === filter ? 'active' : ''}`;
        button.textContent = filter === 'all' ? t('allMoods') : filter.charAt(0).toUpperCase() + filter.slice(1);
        button.addEventListener('click', () => {
            activeMood = filter;
            render();
        });
        moodFilters.appendChild(button);
    });
}

function renderPoems() {
    if (!poemList || !resultsCount) return;

    const currentUser = getCurrentUser();
    const filtered = getFilteredPoems();
    resultsCount.textContent = `${filtered.length} ${t(filtered.length === 1 ? 'poemCount' : 'poemsCount')}`;

    if (!filtered.length) {
        poemList.innerHTML = `<div class="empty-state">${t('noSearchResults')}</div>`;
        return;
    }

    poemList.innerHTML = '';
    filtered.forEach((poem) => {
        const card = document.createElement('article');
        card.className = `poem-card ${poem.id === selectedPoemId ? 'active' : ''}`;
        const isAuthor = currentUser && poem.author === currentUser.name;
        card.innerHTML = `
            <div class="meta-row">
                <span>${poem.mood}</span>
                <span>${poem.author}</span>
                <span>${formatDate(poem.createdAt)}</span>
            </div>
            <div class="card-title-row">
                <h4>${poem.title}</h4>
                ${isAuthor ? `<button class="ghost-button delete-btn" data-id="${poem.id}">${t('delete')}</button>` : ''}
            </div>
            <p>${poem.excerpt}</p>
            <div class="card-actions">
                <span>❤ ${poem.likes || 0}</span>
                <button class="pill like-btn" data-id="${poem.id}">${t('like')}</button>
            </div>
        `;
        card.querySelector('h4').addEventListener('click', () => {
            selectedPoemId = poem.id;
            render();
        });
        // Make the whole card clickable for convenience
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            selectedPoemId = poem.id;
            render();
        });
        card.querySelector('.like-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLike(poem.id);
        });
        if (isAuthor) {
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm(t('deleteConfirmation'))) return;
                deletePoem(poem.id);
            });
        }
        poemList.appendChild(card);
    });
}

async function deletePoem(poemId) {
    const index = poems.findIndex((p) => p.id === poemId);
    if (index === -1) return;
    try {
        await fetch(`/api/poems/${poemId}`, { method: 'DELETE' });
    } catch (e) {
        console.error('Failed to delete poem', e);
    }
    poems.splice(index, 1);
    if (selectedPoemId === poemId) selectedPoemId = poems[0] ? poems[0].id : null;
    render();
}

function renderDetail() {
    if (!detailTitle || !detailAuthor || !detailDescription || !detailLines) return;

    if (!poems.length) {
        detailTitle.textContent = '';
        detailAuthor.textContent = '';
        detailDescription.textContent = '';
        detailLines.innerHTML = `<div class="empty-state">${t('noPoemsYet')}</div>`;
        if (featuredTitle) featuredTitle.textContent = '';
        if (featuredExcerpt) featuredExcerpt.textContent = '';
        return;
    }

    const selectedPoem = poems.find((poem) => poem.id === selectedPoemId) || poems[0];
    detailTitle.textContent = selectedPoem.title;
    detailAuthor.textContent = `${selectedPoem.author}${selectedPoem.createdAt ? ' • ' + formatDate(selectedPoem.createdAt) : ''}`;
    detailDescription.textContent = selectedPoem.description;
    detailLines.innerHTML = selectedPoem.lines.map((line) => `<p>${line}</p>`).join('');

    const likeAction = document.createElement('div');
    likeAction.style.marginTop = '12px';
    likeAction.innerHTML = `<button class="pill" id="detailLike">${t('like')}</button> <span id="detailLikes">${selectedPoem.likes || 0} ${t('likes')}</span>`;
    const existing = document.getElementById('detailLike');
    if (existing) existing.parentNode.remove();
    detailLines.appendChild(likeAction);
    document.getElementById('detailLike').addEventListener('click', () => toggleLike(selectedPoem.id));

    if (featuredTitle) featuredTitle.textContent = selectedPoem.title;
    if (featuredExcerpt) featuredExcerpt.textContent = selectedPoem.excerpt;
}

function render() {
    renderFilters();
    renderPoems();
    renderDetail();
    if (typeof renderAuthState === 'function') renderAuthState();
}

if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        searchTerm = event.target.value;
        render();
    });
}

if (featuredButton) {
    featuredButton.addEventListener('click', () => {
        const featured = poems.find((poem) => poem.id === selectedPoemId) || poems[0];
        const detailCard = document.querySelector('.detail-card');
        if (detailCard) detailCard.scrollIntoView({ behavior: 'smooth' });
        selectedPoemId = featured ? featured.id : null;
        render();
    });
}

window.addEventListener('storage', (event) => {
    if (event.key === 'poems') {
        const updated = JSON.parse(event.newValue || '[]');
        poems.splice(0, poems.length, ...updated);
        if (!poems.find((p) => p.id === selectedPoemId)) selectedPoemId = poems[0] ? poems[0].id : null;
        render();
    }
});

document.addEventListener('authchange', render);

render();

// initial load from server
loadPoems().then(render);

// Handle post submissions from the main page post modal
const mainPostForm = document.getElementById('postForm');
if (mainPostForm) {
    mainPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('postTitle') ? document.getElementById('postTitle').value.trim() : '';
        const excerpt = document.getElementById('postExcerpt') ? document.getElementById('postExcerpt').value.trim() : '';
        const mood = document.getElementById('postMood') ? document.getElementById('postMood').value.trim() || 'other' : 'other';
        const lines = document.getElementById('postLines') ? document.getElementById('postLines').value.split('\n').map(l => l.trim()).filter(Boolean) : [];
        if (!title || !lines.length) return alert(t('fillFormPreview'));
        const user = getCurrentUser();
        const poemPayload = { title, author: user ? user.name : 'Anonymous', mood, excerpt, description: excerpt, lines };
        try {
            const res = await fetch('/api/poems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(poemPayload) });
            const data = await res.json();
            if (res.ok && data.poem) poems.unshift(data.poem);
        } catch (e) {
            console.error('Failed to save poem', e);
        }
        mainPostForm.reset();
        if (typeof closeModal === 'function') closeModal('postModal');
        render();
    });
}
