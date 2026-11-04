'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), assert = require('node:assert/strict');
const consumer = path.resolve(process.argv[2]), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-use-size-chrome-'));
let server, child, socket, sequence = 0; const pending = new Map();
(async () => { try {
  server = http.createServer((req, res) => { if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(consumer, 'bundle.js'))); } else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><style>.vertical{writing-mode:vertical-rl}#target{width:30.5px;height:40.25px;box-sizing:border-box;border:1px solid;padding:2px}</style><div id="target"></div><div id="root"></div><script src="/bundle.js"></script>'); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const chrome = process.env.CHROME_BIN || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
  let port; ({ child, port } = await require('../vlx-conformance/launch-chrome.cjs')(chrome, profile));
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); socket = new WebSocket(tabs.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => { const x = JSON.parse(event.data), p = pending.get(x.id); if (p) { pending.delete(x.id); clearTimeout(p.timer); x.error ? p.reject(Error(JSON.stringify(x.error))) : p.resolve(x.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => reject(Error('CDP timeout: ' + method)), 15000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  await send('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port });
  const result = await send('Runtime.evaluate', { expression: '(async()=>{for(let i=0;i<200;i++){if(window.runChecks)return await window.runChecks();await new Promise(r=>setTimeout(r,20));}throw Error("Fixture did not load")})()', awaitPromise: true, returnByValue: true });
  assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); assert.equal(Object.values(result.result.value).filter(Boolean).length, 5);
  console.log('Chrome native ResizeObserver:', JSON.stringify(result.result.value));
} finally {
  for (const p of pending.values()) clearTimeout(p.timer); socket?.close();
  if (child && child.exitCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; }
  await new Promise(resolve => server ? server.close(resolve) : resolve()); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
} })().catch(error => { console.error(error); process.exitCode = 1; });
