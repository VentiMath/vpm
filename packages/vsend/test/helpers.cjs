'use strict';
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

exports.files = function files(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vsend-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'public'); fs.mkdirSync(root);
  for (const [name, content] of Object.entries({
    'data.txt': '0123456789abcdefghij', 'empty.txt': '', 'a & b.txt': 'encoded', 'two..dots.txt': 'dots',
    '.secret': 'hidden', '.private/data.txt': 'hidden nested', 'dir/index.html': '<h1>index</h1>',
    'fallback.htm': 'fallback', 'dir/other.html': 'other', 'noindex/placeholder': 'no index',
    'page.json': '{"ok":true}', 'nested/.hidden.html': 'hidden index',
  })) {
    const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
    fs.utimesSync(file, new Date('2025-01-01T00:00:00Z'), new Date('2025-01-01T00:00:00Z'));
  }
  fs.writeFileSync(path.join(directory, 'outside.txt'), 'outside');
  return { root, directory };
};

exports.server = async function server(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return server;
};

exports.request = function request(server, route = '/data.txt', { method = 'GET', headers = {}, body, agent = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, method, headers, agent }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('request timed out')));
    req.on('error', reject); req.end(body);
  });
};
