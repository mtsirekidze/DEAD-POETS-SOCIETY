const { hashPassword } = require('./db');
const db = require('./db');

function sendJSON(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'Method not allowed' });
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    try {
      const { email, password } = JSON.parse(body || '{}');
      if (!email || !password) return sendJSON(res, 400, { error: 'Missing fields' });
      const normalizedEmail = String(email).toLowerCase();
      const user = await db.findUserByEmail(normalizedEmail);
      if (!user) return sendJSON(res, 401, { error: 'Invalid credentials' });
      const hashedInput = hashPassword(password);
      if (user.password !== hashedInput) return sendJSON(res, 401, { error: 'Invalid credentials' });
      const safe = { id: user.id, name: user.name, email: user.email, bio: user.bio || '', picture: user.picture || '' };
      return sendJSON(res, 200, { ok: true, user: safe });
    } catch (e) {
      console.error('login error', e);
      return sendJSON(res, 500, { error: 'Server error' });
    }
  });
};
