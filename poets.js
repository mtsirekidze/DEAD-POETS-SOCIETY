const publishedPoems = JSON.parse(localStorage.getItem('poems')) || [];
const poetsList = document.getElementById('poetsList');
const publishedCount = document.getElementById('publishedCount');
const likesTopList = document.getElementById('likesTopList');
const postsTopList = document.getElementById('postsTopList');
const likesToggle = document.getElementById('likesToggle');
const postsToggle = document.getElementById('postsToggle');

function getPublishedPoems() {
    return publishedPoems.filter((poem) => poem.title && poem.author);
}

function buildAuthorStats(poems) {
    const stats = poems.reduce((acc, poem) => {
        const name = poem.author;
        if (!acc[name]) acc[name] = { author: name, likes: 0, posts: 0 };
        acc[name].likes += poem.likes || 0;
        acc[name].posts += 1;
        return acc;
    }, {});
    return Object.values(stats);
}

function renderRankList(listNode, items, statKey, limit = 3) {
    listNode.innerHTML = '';
    const displayItems = items.slice(0, limit);
    displayItems.forEach((item, index) => {
        const entry = document.createElement('li');
        const postLabel = item.posts === 1 ? t('postCount') : t('postsCount');
        const likeLabel = item.likes === 1 ? t('likeCount') : t('likes');
        const statLabel = statKey === 'likes' ? likeLabel : postLabel;
        entry.innerHTML = `
            <span class="rank">${index + 1}</span>
            <div>
                <strong>${item.author}</strong>
                <div class="meta">${item.posts} ${postLabel} • ${item.likes} ${likeLabel}</div>
            </div>
            <span class="stat">${item[statKey]} ${statLabel}</span>
        `;
        listNode.appendChild(entry);
    });
}

let showingFullLikes = false;
let showingFullPosts = false;

function renderPublishedPoets() {
    const published = getPublishedPoems();
    publishedCount.textContent = `${published.length} ${t('publishedPoets')}`;

    if (!published.length) {
        poetsList.innerHTML = `<div class="empty-state">${t('noPublishedPoems')}</div>`;
        likesTopList.innerHTML = '';
        postsTopList.innerHTML = '';
        return;
    }

    poetsList.innerHTML = '';
    published.forEach((poem) => {
        const card = document.createElement('article');
        card.className = 'poem-card';
        card.innerHTML = `
            <div class="meta-row"><span>${poem.author}</span><span>${poem.title}</span></div>
            <h4>${poem.title}</h4>
            <p>${poem.excerpt || poem.description || t('publishedPoemSite')}</p>
            <div class="card-actions"><span>${poem.lines ? poem.lines.slice(0, 2).join(' ') : ''}</span></div>
        `;
        poetsList.appendChild(card);
    });

    renderTopLists();
}

likesToggle.addEventListener('click', handleLikesToggle);
postsToggle.addEventListener('click', handlePostsToggle);

function renderTopLists() {
    const published = getPublishedPoems();
    const authorStats = buildAuthorStats(published);
    const topByLikes = [...authorStats].sort((a, b) => b.likes - a.likes || b.posts - a.posts);
    const topByPosts = [...authorStats].sort((a, b) => b.posts - a.posts || b.likes - a.likes);

    renderRankList(likesTopList, topByLikes, 'likes', showingFullLikes ? topByLikes.length : 3);
    renderRankList(postsTopList, topByPosts, 'posts', showingFullPosts ? topByPosts.length : 3);

    likesToggle.textContent = showingFullLikes ? t('showTop3') : t('seeFullList');
    postsToggle.textContent = showingFullPosts ? t('showTop3') : t('seeFullList');
}

function handleLikesToggle() {
    showingFullLikes = !showingFullLikes;
    renderTopLists();
}

function handlePostsToggle() {
    showingFullPosts = !showingFullPosts;
    renderTopLists();
}

renderPublishedPoets();

document.addEventListener('languagechange', () => {
    renderPublishedPoets();
});
