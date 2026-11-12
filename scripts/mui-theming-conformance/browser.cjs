"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vtheming-browser-"));
let server, child, socket;
const pending = new Map();
let sequence = 0;
(async () => {
  try {
    const base = require("./build.cjs");
    server = http.createServer((req, res) => {
      const match = req.url.match(
        /^\/(current|app)-(upstream|vpm)(\/browser.js)?$/,
      );
      if (!match) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const variant = match[1] + "-" + match[2];
      res.setHeader("content-type", match[3] ? "text/javascript" : "text/html");
      res.end(
        match[3]
          ? fs.readFileSync(base + "/" + variant + "/browser.js")
          : '<!doctype html><title>MUI theme context</title><script src="/' +
              variant +
              '/browser.js"></script>',
      );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const chrome =
      process.env.CHROME_BIN ||
      [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
      ].find(fs.existsSync);
    let port;
    ({ child, port } = await require("../vlx-conformance/launch-chrome.cjs")(
      chrome,
      scratch + "/profile",
    ));
    const tabs = await (
      await fetch("http://127.0.0.1:" + port + "/json/list")
    ).json();
    socket = new WebSocket(
      tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((r, j) => {
      socket.onopen = r;
      socket.onerror = j;
    });
    socket.onmessage = (e) => {
      const v = JSON.parse(e.data),
        p = pending.get(v.id);
      if (p) {
        pending.delete(v.id);
        clearTimeout(p.timer);
        v.error ? p.reject(v.error) : p.resolve(v.result);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence,
          timer = setTimeout(
            () => reject(Error("Browser command timeout")),
            30000,
          );
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    for (const version of ["current", "app"]) {
      let baseline;
      for (const kind of ["upstream", "vpm"]) {
        const variant = version + "-" + kind;
        await send("Page.navigate", {
          url: "http://127.0.0.1:" + server.address().port + "/" + variant,
        });
        const result = await send("Runtime.evaluate", {
          expression: `(async()=>{for(let n=0;n<200;n++){if(window.variant===${JSON.stringify(variant)}&&window.runChecks)return await window.runChecks();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture missing');})()`,
          awaitPromise: true,
          returnByValue: true,
        });
        assert.equal(
          result.exceptionDetails,
          undefined,
          JSON.stringify(result.exceptionDetails),
        );
        if (kind === "upstream") baseline = result.result.value;
        else assert.deepEqual(result.result.value, baseline);
      }
    }
    console.log(
      "Chrome: unchanged current/app MUI themes, nested colors, stable memo consumers, focus and teardown pass",
    );
  } finally {
    for (const p of pending.values()) clearTimeout(p.timer);
    socket?.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      const end = new Promise((r) => child.once("exit", r));
      child.kill();
      const t = setTimeout(() => child.kill("SIGKILL"), 3000);
      await end;
      clearTimeout(t);
    }
    server?.closeAllConnections();
    await new Promise((r) => (server ? server.close(r) : r()));
    fs.rmSync(scratch, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
