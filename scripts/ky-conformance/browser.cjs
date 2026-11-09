"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = __dirname + "/node_modules/.vpm-ky",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-ky-chrome-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    fs.mkdirSync(consumer, { recursive: true });
    require("node:child_process").execFileSync(
      "bun",
      [
        "build",
        path.join(__dirname, "browser-entry.mjs"),
        "--target=browser",
        "--outfile=" + path.join(consumer, "browser.js"),
      ],
      { stdio: "inherit" },
    );
    server = require("./server.cjs").server((req, res) => {
      if (req.url === "/bundle.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(consumer, "browser.js")));
        return true;
      }
      if (req.url === "/") {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><script type="module" src="/bundle.js"></script>',
        );
        return true;
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
    const result = await send("Runtime.evaluate", {
      expression: `(async()=>{for(let i=0;i<250;i++){if(window.runKy)return await window.runKy();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
      awaitPromise: true,
      returnByValue: true,
    });
    assert.equal(
      result.exceptionDetails,
      undefined,
      JSON.stringify(result.exceptionDetails),
    );
    const rows = result.result.value;
    fs.writeFileSync(
      path.join(consumer, "browser-results.json"),
      JSON.stringify(rows, null, 2),
    );
    for (const row of rows) assert.deepEqual(row.vpm, row.upstream);
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome: current and application public API plus native HTTP scenarios match.",
    );
  } finally {
    for (const p of pending.values()) clearTimeout(p.timer);
    socket?.close();
    if (child && child.exitCode === null) {
      const ended = new Promise((r) => child.once("exit", r));
      child.kill();
      await ended;
    }
    server?.closeAllConnections();
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
