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
    const users = db.getUsers().map(u => ({ id: u.id, name: u.name, email: u.email, bio: u.bio || '', picture: u.picture || '' }));
    return sendJSON(res, 200, { ok: true, users });
  }

  if (method === 'PUT') {
    const id = parseInt(segments[1], 10);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const users = db.getUsers();
        const uidx = users.findIndex(u => u.id === id);
        if (uidx === -1) return sendJSON(res, 404, { error: 'User not found' });
        users[uidx] = Object.assign({}, users[uidx], payload);
        db.saveUsers(users);
        if (payload.name) {
          const poems = db.getPoems();
          let changed = false;
          poems.forEach(p => { if (p.author === payload.oldName) { p.author = payload.name; changed = true; } });
          if (changed) db.savePoems(poems);
        }
        const safe = { id: users[uidx].id, name: users[uidx].name, email: users[uidx].email, bio: users[uidx].bio || '', picture: users[uidx].picture || '' };
        return sendJSON(res, 200, { ok: true, user: safe });
      } catch (e) {
        return sendJSON(res, 500, { error: 'Server error' });
      }
    });
    return;
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
