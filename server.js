const http = require('http');
const fs = require('fs');
const path = require('path');

function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? '/index.html' : req.url);
  if (filePath.indexOf('?') !== -1) filePath = filePath.split('?')[0];
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const apiMap = {
  '/api/register': require('./api/register'),
  '/api/login': require('./api/login'),
  '/api/poems': require('./api/poems'),
  '/api/users': require('./api/users')
};

const server = http.createServer((req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      // find matching handler by prefix
      const base = Object.keys(apiMap).find(k => req.url === k || req.url.startsWith(k + '/'));
      if (base) return apiMap[base](req, res);
      // fallback for /api/poems/:id or /api/users/:id
      if (req.url.startsWith('/api/poems')) return apiMap['/api/poems'](req, res);
      if (req.url.startsWith('/api/users')) return apiMap['/api/users'](req, res);
      res.writeHead(404); res.end('API Not found');
      return;
    }
    serveStatic(req, res);
  } catch (e) { res.writeHead(500); res.end('Server error'); }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('Server running on port', port));
