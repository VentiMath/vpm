"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http"),
  { spawn, spawnSync } = require("node:child_process");
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "vpm-react-interactions-browser-"),
);
const chrome =
  process.env.CHROME_BIN ||
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((file) => fs.existsSync(file));
assert.ok(chrome, "Chrome is required; set CHROME_BIN");
let server, child, socket, timer;
(async () => {
  const built = spawnSync(
    "bun",
    [path.join(__dirname, "build-browser.cjs"), temp],
    { encoding: "utf8" },
  );
  assert.equal(built.status, 0, built.stdout + built.stderr);
  server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><script type="module">import {run as upstream} from '/upstream.mjs';import {run as vpm} from '/vpm.mjs';window.checks=(async()=>({upstream:await upstream(),vpm:await vpm()}))();</script>`,
      );
    } else if (["/upstream.mjs", "/vpm.mjs"].includes(req.url)) {
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(path.join(temp, req.url.slice(1))));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const profile = path.join(temp, "profile");
  child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-proxy-server",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const portFile = path.join(profile, "DevToolsActivePort");
  const port = await require('./chrome-port.cjs')(portFile);
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(
    pages.find((p) => p.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.method === 'Runtime.bindingCalled' && event.params.name === 'vpmPress') {
      const {key} = JSON.parse(event.params.payload);
      (async () => {
        const code = key.length === 1 ? 'Key' + key.toUpperCase() : key;
        await send('Input.dispatchKeyEvent', {type:'keyDown', key, code, windowsVirtualKeyCode: {Tab:9, Escape:27, ArrowDown:40, End:35}[key] || key.toUpperCase().charCodeAt(0)});
        await send('Input.dispatchKeyEvent', {type:'keyUp', key, code});
        await send('Runtime.evaluate', {expression:'window.vpmKeyDone()'});
      })().catch(error => {for (const {reject} of pending.values()) reject(error);});
      return;
    }
    const data = event,
      call = pending.get(data.id);
    if (call) {
      pending.delete(data.id);
      data.error
        ? call.reject(Error(JSON.stringify(data.error)))
        : call.resolve(data.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  timer = setTimeout(() => {
    for (const { reject } of pending.values())
      reject(Error("Browser checks timed out"));
  }, 45000);
  await send("Runtime.enable");
  await send("Runtime.addBinding", {name:"vpmPress"});
  await send("Page.navigate", {
    url: "http://127.0.0.1:" + server.address().port,
  });
  const evaluated = await send("Runtime.evaluate", {
    expression:
      "(async()=>{while(!window.checks)await new Promise(r=>setTimeout(r,10));return await window.checks;})()",
    awaitPromise: true,
    returnByValue: true,
  });
  assert.equal(
    evaluated.exceptionDetails,
    undefined,
    JSON.stringify(evaluated.exceptionDetails),
  );
  const result = evaluated.result.value;
  assert.deepEqual(result.vpm, result.upstream);
  assert.equal(result.vpm.checks, 10);
  console.log(
    "Chrome: 10 app-shaped popover, modal focus and keyboard menu checks match; portals clean up.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    clearTimeout(timer);
    socket?.close();
    if (child) {
      const ended = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await ended;
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  });
