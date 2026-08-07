const db = require('./db');

function sendJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'Method not allowed' });
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const { email, password } = JSON.parse(body || '{}');
      if (!email || !password) return sendJSON(res, 400, { error: 'Missing fields' });
      const users = db.getUsers();
      const user = users.find((u) => u.email === email && u.password === password);
      if (!user) return sendJSON(res, 401, { error: 'Invalid credentials' });
      const safe = { id: user.id, name: user.name, email: user.email, bio: user.bio || '', picture: user.picture || '' };
      return sendJSON(res, 200, { ok: true, user: safe });
    } catch (e) {
      return sendJSON(res, 500, { error: 'Server error' });
    }
  });
};
