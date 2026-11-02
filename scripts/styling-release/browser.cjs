'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const {spawn} = require('node:child_process');
const directory = path.resolve(process.argv[2]);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-styling-chrome-'));
const chrome = process.env.CHROME_BIN || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
assert.ok(chrome, 'Chrome is required; set CHROME_BIN');
let child, socket, timer, server;
(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><script type="module">import {run} from "/entry.mjs";window.checks=run();</script>');
    } else if (req.url === '/entry.mjs') {
      res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(directory, 'entry.mjs')));
    } else {res.statusCode = 404; res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-proxy-server', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {stdio: 'ignore'});
  const port = await require('../floating-react-conformance/chrome-port.cjs')(path.join(profile, 'DevToolsActivePort'));
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {socket.onopen = resolve; socket.onerror = reject;});
  let id = 0; const pending = new Map();
  socket.onmessage = message => {
    const data = JSON.parse(message.data), call = pending.get(data.id);
    if (call) {pending.delete(data.id); data.error ? call.reject(Error(JSON.stringify(data.error))) : call.resolve(data.result);}
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {pending.set(++id, {resolve, reject}); socket.send(JSON.stringify({id, method, params}));});
  timer = setTimeout(() => {for (const call of pending.values()) call.reject(Error('Browser check timed out'));}, 45000);
  await send('Page.navigate', {url: 'http://127.0.0.1:' + server.address().port});
  const result = await send('Runtime.evaluate', {expression: '(async()=>{while(!window.checks)await new Promise(r=>setTimeout(r,10));return await window.checks;})()', awaitPromise: true, returnByValue: true});
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  assert.equal(result.result.value.checks, 25);
  console.log('Chrome: ' + result.result.value.checks + ' styling integration checks pass.');
})().catch(error => {console.error(error); process.exitCode = 1;}).finally(async () => {
  clearTimeout(timer); socket?.close();
  if (child && child.exitCode === null) {const stopped = new Promise(resolve => child.once('exit', resolve)); child.kill(); await stopped;}
  if (server) await new Promise(resolve => server.close(resolve));
  // Chrome helper processes can finish profile writes after the main child exits.
  fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
});
