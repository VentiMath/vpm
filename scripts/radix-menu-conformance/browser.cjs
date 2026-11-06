'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), assert = require('node:assert/strict');
const variant = process.argv[3] || 'vpm';
const consumer = path.resolve(process.argv[2]), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-menu-chrome-'));
let server, child, socket, sequence = 0; const pending = new Map(), exceptions = [];
(async () => { try {
  server = http.createServer((req, res) => { if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(consumer, variant + '.mjs'))); } else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script type="module" src="/bundle.js"></script>'); } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const chrome = process.env.CHROME_BIN || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
  let port; ({ child, port } = await require('../vlx-conformance/launch-chrome.cjs')(chrome, profile));
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); socket = new WebSocket(tabs.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => { const x = JSON.parse(event.data), p = pending.get(x.id); if (x.method === 'Runtime.exceptionThrown') exceptions.push(x.params.exceptionDetails); if (p) { pending.delete(x.id); clearTimeout(p.timer); x.error ? p.reject(Error(JSON.stringify(x.error))) : p.resolve(x.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => reject(Error('CDP timeout: ' + method)), 15000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port });
  const result = await send('Runtime.evaluate', { expression: '(async()=>{for(let i=0;i<200;i++){if(window.runChecks)return await window.runChecks(' + JSON.stringify(variant) + ');await new Promise(r=>setTimeout(r,20));}throw Error("Fixture did not load")})()', awaitPromise: true, returnByValue: true });
  assert.equal(result.exceptionDetails, undefined, JSON.stringify({evaluation:result.exceptionDetails,exceptions})); assert.equal(result.result.value.passed, true); assert.equal(result.result.value.checks.length, 10);
  fs.writeFileSync(path.join(consumer, variant + '-results.json'), JSON.stringify(result.result.value));
  const evaluate = async expression => {
    const value = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(value.exceptionDetails, undefined, JSON.stringify(value.exceptionDetails)); return value.result.value;
  };
  await evaluate('window.prepareNative()');
  const key = async (key, code = key) => {
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code});
  };
  const until = expression => evaluate('(async()=>{for(let i=0;i<100;i++){if('+expression+')return true;await new Promise(r=>setTimeout(r,20));}throw Error("Native input did not settle: '+expression.replaceAll('"','\\"')+'");})()');
  await key('ArrowDown');await until('document.activeElement.id === "native-first"');
  await key('ArrowDown');await until('document.activeElement.id === "native-last"');
  await key('Tab');assert.equal(await evaluate('document.activeElement.id'),'native-last');
  await key('Enter');await until('!document.getElementById("native-menu") && document.activeElement.id === "native-trigger"');
  assert.deepEqual(await evaluate('window.nativeSelected'),['last']);
  for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,x:100,y:50,button:'left',clickCount:1});
  await until('document.getElementById("native-menu")');
  const point=await evaluate('(()=>{const r=document.getElementById("native-first").getBoundingClientRect();return{x:r.x+15,y:r.y+15}})()');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await until('document.activeElement.id === "native-first"');
  for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
  await until('!document.getElementById("native-menu")');assert.deepEqual(await evaluate('window.nativeSelected'),['last','first']);
  await evaluate('window.finishNative()');
  assert.deepEqual(exceptions, []);
  console.log('Chrome Menu ' + variant + ': ' + result.result.value.checks.join(', '));
} finally {
  for (const p of pending.values()) clearTimeout(p.timer); socket?.close();
  if (child && child.exitCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; }
  await new Promise(resolve => server ? server.close(resolve) : resolve()); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
} })().catch(error => { console.error(error); process.exitCode = 1; });
