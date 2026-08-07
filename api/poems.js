const db = require('./db');
const url = require('url');

function sendJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  const method = req.method;
  const parsed = url.parse(req.url, true);
  let segments = parsed.pathname.split('/').filter(Boolean);
  if (segments[0] === 'api') segments = segments.slice(1);

  if (method === 'GET') {
    try {
      const poems = await db.getPoems();
      return sendJSON(res, 200, { ok: true, poems });
    } catch (e) {
      console.error('get poems error', e);
      return sendJSON(res, 500, { error: 'Server error' });
    }
  }

  if (method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (segments[2] === 'like' || parsed.pathname.endsWith('/like')) {
          const id = parseInt(segments[1], 10);
          const poems = await db.getPoems();
          const p = poems.find((x) => x.id === id);
          if (!p) return sendJSON(res, 404, { error: 'Not found' });
          const updated = await db.updatePoemLikes(id, (p.likes || 0) + 1);
          return sendJSON(res, 200, { ok: true, poem: updated });
        }

        const poem = Object.assign({ id: Date.now(), likes: 0, createdAt: new Date().toISOString() }, payload);
        const created = await db.createPoem(poem);
        return sendJSON(res, 201, { ok: true, poem: created });
      } catch (e) {
        console.error('create poem error', e);
        return sendJSON(res, 500, { error: 'Server error' });
      }
    });
    return;
  }

  if (method === 'DELETE') {
    try {
      const id = parseInt(segments[1], 10);
      const deleted = await db.deletePoem(id);
      if (!deleted) return sendJSON(res, 404, { error: 'Not found' });
      return sendJSON(res, 200, { ok: true });
    } catch (e) {
      console.error('delete poem error', e);
      return sendJSON(res, 500, { error: 'Server error' });
    }
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
