const http = require('http');

const req = (opts, body) => new Promise((resolve, reject) => {
  const r = http.request(opts, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  r.on('error', reject);
  if (body) r.write(body);
  r.end();
});

(async () => {
  const host = 'localhost';
  const port = 3000;
  const headers = { 'Content-Type': 'application/json' };
  const post = (path, body) => req({ method: 'POST', hostname: host, port, path, headers }, JSON.stringify(body));
  const get = (path) => req({ method: 'GET', hostname: host, port, path });

  const reg = await post('/api/register', { name: 'Test User', email: 'test@example.com', password: 'passwd' });
  console.log('register', reg.status, reg.body);
  const login = await post('/api/login', { email: 'test@example.com', password: 'passwd' });
  console.log('login', login.status, login.body);
  const before = await get('/api/poems');
  console.log('poems before', before.status, before.body);
  const postPoem = await post('/api/poems', { title: 'A New Poem', author: 'Test User', mood: 'hopeful', excerpt: 'An excerpt', description: 'An excerpt', lines: ['line1', 'line2'] });
  console.log('post poem', postPoem.status, postPoem.body);
  const after = await get('/api/poems');
  console.log('poems after', after.status, after.body);
})();
