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
    const users = (await db.getUsers()).map(u => ({ id: u.id, name: u.name, email: u.email, bio: u.bio || '', picture: u.picture || '' }));
    return sendJSON(res, 200, { ok: true, users });
  }

  if (method === 'PUT') {
    const id = parseInt(segments[1], 10);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const existing = await db.getUserById(id);
        if (!existing) return sendJSON(res, 404, { error: 'User not found' });
        const updates = {};
        if (payload.name !== undefined) updates.name = payload.name;
        if (payload.email !== undefined) updates.email = String(payload.email).toLowerCase();
        if (payload.password !== undefined) updates.password = payload.password;
        if (payload.bio !== undefined) updates.bio = payload.bio;
        if (payload.picture !== undefined) updates.picture = payload.picture;
        const user = await db.updateUser(id, updates);
        if (payload.name && payload.oldName) {
          await db.updatePoemAuthors(payload.oldName, payload.name);
        }
        const safe = { id: user.id, name: user.name, email: user.email, bio: user.bio || '', picture: user.picture || '' };
        return sendJSON(res, 200, { ok: true, user: safe });
      } catch (e) {
        console.error('users update error', e);
        return sendJSON(res, 500, { error: 'Server error' });
      }
    });
    return;
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
