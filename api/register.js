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
      const { name, email, password } = JSON.parse(body || '{}');
      if (!email || !password) return sendJSON(res, 400, { error: 'Missing fields' });
      const users = db.getUsers();
      if (users.find((u) => u.email === email)) return sendJSON(res, 409, { error: 'Email already registered' });
      const user = { id: Date.now(), name: name || email.split('@')[0], email, password };
      users.push(user);
      db.saveUsers(users);
      const safe = { id: user.id, name: user.name, email: user.email };
      return sendJSON(res, 201, { ok: true, user: safe });
    } catch (e) {
      return sendJSON(res, 500, { error: 'Server error' });
    }
  });
};
