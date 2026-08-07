const db = require('./db');
const url = require('url');

function sendJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = (req, res) => {
  const method = req.method;
  const parsed = url.parse(req.url, true);
  let segments = parsed.pathname.split('/').filter(Boolean);
  if (segments[0] === 'api') segments = segments.slice(1);

  if (method === 'GET') {
    const poems = db.getPoems();
    return sendJSON(res, 200, { ok: true, poems });
  }

  if (method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const poems = db.getPoems();
        if (segments[2] === 'like' || parsed.pathname.endsWith('/like')) {
          const id = parseInt(segments[1], 10);
          const p = poems.find((x) => x.id === id);
          if (!p) return sendJSON(res, 404, { error: 'Not found' });
          p.likes = (p.likes || 0) + 1;
          db.savePoems(poems);
          return sendJSON(res, 200, { ok: true, poem: p });
        }

        const poem = Object.assign({ id: Date.now(), likes: 0, createdAt: new Date().toISOString() }, payload);
        poems.unshift(poem);
        db.savePoems(poems);
        return sendJSON(res, 201, { ok: true, poem });
      } catch (e) {
        return sendJSON(res, 500, { error: 'Server error' });
      }
    });
    return;
  }

  if (method === 'DELETE') {
    const id = parseInt(segments[1], 10);
    const poems = db.getPoems();
    const idx = poems.findIndex((p) => p.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: 'Not found' });
    poems.splice(idx, 1);
    db.savePoems(poems);
    return sendJSON(res, 200, { ok: true });
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
