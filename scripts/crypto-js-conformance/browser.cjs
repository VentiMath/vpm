"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vcrypto-browser-"));
let server, child, socket;
const pending = new Map();
let sequence = 0;
(async () => {
  try {
    require("esbuild").buildSync({
      entryPoints: [__dirname + "/browser-entry.mjs"],
      outfile: scratch + "/bundle.js",
      bundle: true,
      format: "iife",
      platform: "browser",
      alias: {
        "vcrypto-js": path.resolve(__dirname, "../../packages/vcrypto-js"),
      },
      logLevel: "silent",
    });
    server = http.createServer((req, res) => {
      res.setHeader(
        "content-type",
        req.url === "/bundle.js" ? "text/javascript" : "text/html",
      );
      res.end(
        req.url === "/bundle.js"
          ? fs.readFileSync(scratch + "/bundle.js")
          : '<!doctype html><title>Hash conformance</title><script src="/bundle.js"></script>',
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
    await send("Page.navigate", {
      url: "http://127.0.0.1:" + server.address().port,
    });
    const result = await send("Runtime.evaluate", {
      expression:
        '(async()=>{for(let n=0;n<200;n++){if(window.runChecks)return await window.runChecks();await new Promise(r=>setTimeout(r,20));}throw Error("Fixture missing");})()',
      awaitPromise: true,
      returnByValue: true,
    });
    assert.equal(
      result.exceptionDetails,
      undefined,
      JSON.stringify(result.exceptionDetails),
    );
    assert.equal(result.result.value, 58);
    console.log(
      "Chrome:58 native Web Crypto and actual caller-shape comparisons pass",
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
