"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = __dirname + "/node_modules/.vpm-react-popper",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-react-popper-chrome-"));
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
      [path.join(__dirname, "build.cjs")],
      { stdio: "inherit" },
    );
    server = http.createServer((req, res) => {
      if (
        /^\/(upstream-current|vpm-current|upstream-app|vpm-app|upstream-engine|vpm-engine)\/browser-entry.js$/.test(
          req.url,
        )
      ) {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(consumer, req.url)));
        return;
      }
      if (
        /^\/(upstream-current|vpm-current|upstream-app|vpm-app|upstream-engine|vpm-engine)$/.test(
          req.url,
        )
      ) {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><meta name="viewport" content="width=device-width"><script type="module" src="' +
            req.url +
            '/browser-entry.js"></script>',
        );
        return;
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
    for (const width of [1024, 768]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
      let baseline;
      for (const variant of ["upstream-current", "vpm-current"]) {
        await send("Page.navigate", {
          url: "http://127.0.0.1:" + server.address().port + "/" + variant,
        });
        const result = await send("Runtime.evaluate", {
          expression: `(async()=>{for(let i=0;i<250;i++){if(window.formVariant===${JSON.stringify(variant)} && window.runForms)return await window.runForms(${variant.startsWith("upstream") && process.env.VPM_REACT_MODE === "development" ? "false" : "true"});await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
          awaitPromise: true,
          returnByValue: true,
        });
        assert.equal(
          result.exceptionDetails,
          undefined,
          JSON.stringify({ error: result.exceptionDetails, exceptions }),
        );
        if (process.env.VPM_REACT_MODE === "development") {
          const probe = await send("Runtime.evaluate", {
            expression: "window.strictProbe()",
            awaitPromise: true,
            returnByValue: true,
          });
          assert.equal(probe.exceptionDetails, undefined);
          assert.deepEqual(
            probe.result.value,
            variant.startsWith("upstream") ? [0, 0] : [100, 170],
            "React 19 StrictMode positioning regression",
          );
        }
        if (variant.startsWith("upstream")) baseline = result.result.value;
        else {
          const actual = result.result.value;
          const scaled = actual.findIndex(
            (row) => Array.isArray(row) && row[0] === "scaled",
          );
          assert.ok(scaled >= 0);
          const before = baseline[scaled],
            after = actual[scaled];
          assert.equal(before[1], "bottom-start");
          assert.ok(
            before[3] + before[5] > before[8],
            "upstream reproduces clipped scaled menu",
          );
          assert.equal(after[1], "top-start");
          assert.ok(
            after[3] + after[5] <= after[8],
            "VPM scaled menu remains inside its clipping container",
          );
          assert.equal(after[2], before[2]);
          assert.deepEqual(after.slice(4, 7), before.slice(4, 7));
          const edge = actual.findIndex(
            (row) => Array.isArray(row) && row[0] === "right-edge",
          );
          const oldEdge = baseline[edge],
            newEdge = actual[edge];
          assert.ok(
            oldEdge[2] + oldEdge[4] > oldEdge[9],
            "control tether extends into the scrollbar",
          );
          assert.ok(
            newEdge[2] + newEdge[4] <= newEdge[9],
            "VPM menu stays within the scrollport",
          );
          assert.ok(
            newEdge[6] + 4 >= newEdge[10],
            "arrow remains attached to the reference",
          );
          assert.deepEqual(newEdge.slice(0, 2), oldEdge.slice(0, 2));
          assert.deepEqual(newEdge.slice(3, 6), oldEdge.slice(3, 6));
          assert.deepEqual(
            actual.filter((_, i) => i !== scaled && i !== edge),
            baseline.filter((_, i) => i !== scaled && i !== edge),
            variant + " at " + width,
          );
        }
      }
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome: 96 placement comparisons, scroll/offset/arrow scenarios, explicit scale-clipping correction, focus-preserving updates and reopen lifecycle pass.",
    );
  } finally {
    for (const p of pending.values()) clearTimeout(p.timer);
    socket?.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      const ended = new Promise((r) => child.once("exit", r));
      child.kill();
      const deadline = setTimeout(() => child.kill("SIGKILL"), 3000);
      await ended;
      clearTimeout(deadline);
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
