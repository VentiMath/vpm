"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.join(__dirname, "node_modules/.vpm-react-table"),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-react-table-chrome-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    server = http.createServer((req, res) => {
      if (req.url === "/bundle.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(fs.readFileSync(path.join(consumer, "table.js")));
      } else if (req.url === "/lifecycle.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(fs.readFileSync(path.join(consumer, "lifecycle.js")));
      } else {
        res.setHeader("Content-Type", "text/html");
        res.end(
          '<!doctype html><div id="root"></div><script type="module" src="/bundle.js"></script>',
        );
      }
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const chrome =
      process.env.CHROME_BIN ||
      [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
      ].find((p) => fs.existsSync(p));
    let port;
    ({ child, port } = await require("../vlx-conformance/launch-chrome.cjs")(
      chrome,
      profile,
    ));
    const tabs = await (
      await fetch("http://127.0.0.1:" + port + "/json/list")
    ).json();
    socket = new WebSocket(
      tabs.find((p) => p.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    socket.onmessage = (event) => {
      const x = JSON.parse(event.data),
        p = pending.get(x.id);
      if (x.method === "Runtime.exceptionThrown")
        exceptions.push(x.params.exceptionDetails);
      if (p) {
        pending.delete(x.id);
        clearTimeout(p.timer);
        x.error
          ? p.reject(Error(JSON.stringify(x.error)))
          : p.resolve(x.result);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence,
          timer = setTimeout(
            () => reject(Error("CDP timeout: " + method)),
            45000,
          );
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    await send("Runtime.enable");
    await send("Page.navigate", {
      url: "http://127.0.0.1:" + server.address().port,
    });
    const results = [];
    for (const variant of ["app", "vpm"]) {
      const result = await send("Runtime.evaluate", {
        expression: `(async()=>{for(let i=0;i<250;i++){if(window.tableCases?.[${JSON.stringify(variant)}])return await window.tableCases[${JSON.stringify(variant)}]();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
        awaitPromise: true,
        returnByValue: true,
      });
      assert.equal(
        result.exceptionDetails,
        undefined,
        JSON.stringify({ evaluation: result.exceptionDetails, exceptions }),
      );
      results.push(result.result.value);
    }
    fs.writeFileSync(
      path.join(consumer, "browser-results.json"),
      JSON.stringify(results, null, 2),
    );
    assert.deepEqual(results[1], results[0]);
    await send("Runtime.evaluate", {
      expression: `new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/lifecycle.js';s.onload=resolve;s.onerror=reject;document.body.append(s)})`,
      awaitPromise: true,
    });
    const lifecycle = [];
    for (const variant of ["current", "vpm"]) {
      const result = await send("Runtime.evaluate", {
        expression: `window.adapterCases[${JSON.stringify(variant)}]()`,
        awaitPromise: true,
        returnByValue: true,
      });
      assert.equal(
        result.exceptionDetails,
        undefined,
        JSON.stringify(result.exceptionDetails),
      );
      lifecycle.push(result.result.value);
    }
    fs.writeFileSync(
      path.join(consumer, "lifecycle-results.json"),
      JSON.stringify(lifecycle, null, 2),
    );
    assert.deepEqual(lifecycle[1].shared, lifecycle[0].shared);
    assert.equal(lifecycle[1].committedHandler, true);
    assert.equal(lifecycle[1].quietAfterDispose, true);
    assert.equal(lifecycle[1].releasedControl, true);
    assert.equal(lifecycle[0].committedHandler, false);
    assert.equal(lifecycle[0].quietAfterDispose, false);
    assert.equal(lifecycle[0].releasedControl, false);
    assert.deepEqual(lifecycle[1].warnings, []);
    console.log(
      "Lifecycle controls:",
      JSON.stringify(lifecycle.map(({ shared, ...other }) => other)),
    );
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome: unchanged MRT interactions, current selectors/state, stable DOM/focus, hydration, callback ownership and disposal pass.",
    );
  } finally {
    for (const p of pending.values()) clearTimeout(p.timer);
    socket?.close();
    if (child && child.exitCode === null) {
      const ended = new Promise((r) => child.once("exit", r));
      child.kill();
      await ended;
    }
    await new Promise((resolve) =>
      server ? server.close(resolve) : resolve(),
    );
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
