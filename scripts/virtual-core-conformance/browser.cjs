"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.join(__dirname, "node_modules/.vpm-virtual"),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-virtual-chrome-"));
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
        res.end(fs.readFileSync(path.join(consumer, "bundle.js")));
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
    for (const variant of ["current", "app", "vpm"]) {
      const result = await send("Runtime.evaluate", {
        expression: `(async()=>{for(let i=0;i<250;i++){if(window.virtualCases?.[${JSON.stringify(variant)}])return await window.virtualCases[${JSON.stringify(variant)}]();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
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
    for (let i = 0; i < results[0].length; i++)
      assert.deepEqual(
        results[2][i],
        results[0][i],
        results[0][i].label + " current",
      );
    for (let i = 0; i < results[0].length; i++) {
      const actual = results[2][i],
        old = results[1][i];
      if (actual.label === "viewport") {
        assert.deepEqual(actual.actual, actual.expected);
        assert.deepEqual(old.actual, { width: 114, height: 94 });
        continue;
      }
      if (actual.label === "detail-panels") {
        // The app control retains one extra 15px measured-size correction
        // offscreen. Visible geometry/scrolling match; current total is the target.
        assert.equal(actual.total[0] - old.total[0], 15);
        assert.deepEqual(actual, { ...old, total: actual.total });
      } else assert.deepEqual(actual, old, actual.label + " app");
    }
    fs.writeFileSync(
      path.join(consumer, "browser-results.json"),
      JSON.stringify(results, null, 2) + "\n",
    );
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${results[0].length} current/VPM MRT row/column snapshots match; app control differences in viewport sizing and one cached detail-row size are explicitly checked. Main/iframe, dynamic rows, pinning, dragging, scroll alignment, focus and cleanup pass.`,
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
