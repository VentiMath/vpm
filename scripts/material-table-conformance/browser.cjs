"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(
    __dirname,
    "../react-table-conformance/node_modules/.vpm-material-table",
  ),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-table-chrome-"));
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
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.end(fs.readFileSync(path.join(consumer, "browser.js")));
      } else if (req.url === "/lifecycle.js") {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.end(fs.readFileSync(path.join(consumer, "lifecycle.js")));
      } else {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
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
    for (const variant of process.env.UI_ONLY ? [] : ["app", "vpm"]) {
      const result = await send("Runtime.evaluate", {
        expression: `(async()=>{for(let i=0;i<250;i++){if(window.callerCases?.[${JSON.stringify(variant)}])return await window.callerCases[${JSON.stringify(variant)}]();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
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
    // Upstream reinstalls an empty multi-select entry after reset. VPM leaves
    // it absent; both mean no filtering. Preserve raw snapshots for inspection.
    const normalize = (rows) =>
      rows.map(({ text, ...row }) => ({
        ...row,
        filters: row.filters.filter(
          (f) => !Array.isArray(f.value) || f.value.length,
        ),
      }));
    if (!process.env.UI_ONLY)
      assert.deepEqual(normalize(results[1]), normalize(results[0]));
    if (process.env.VPM_MATERIAL_SCREENSHOTS)
      await send("Runtime.evaluate", {
        expression: "window.keepMaterialPreview=true",
      });
    const interactions = [];
    for (const variant of ["app", "vpm"]) {
      const r = await send("Runtime.evaluate", {
        expression: `(async()=>{for(let i=0;i<250;i++){if(window.materialCases?.[${JSON.stringify(variant)}])return await window.materialCases[${JSON.stringify(variant)}]();await new Promise(r=>setTimeout(r,20));}throw Error("Fixture unavailable")})()`,
        awaitPromise: true,
        returnByValue: true,
      });
      assert.equal(
        r.exceptionDetails,
        undefined,
        JSON.stringify({ evaluation: r.exceptionDetails, exceptions }),
      );
      interactions.push(r.result.value);
    }
    assert.deepEqual(interactions[1], interactions[0]);
    if (process.env.VPM_MATERIAL_SCREENSHOTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const colors = [];
      for (const mode of ["light", "dark"]) {
        await send("Runtime.evaluate", {
          expression: `window.materialSetMode(${JSON.stringify(mode)});new Promise(r=>setTimeout(r,150))`,
          awaitPromise: true,
        });
        const color = await send("Runtime.evaluate", {
          expression:
            "getComputedStyle(document.querySelector('[data-vpm=material-react-table]')).backgroundColor",
          returnByValue: true,
        });
        colors.push(color.result.value);
        const capture = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          path.join(process.env.VPM_MATERIAL_SCREENSHOTS, mode + ".png"),
          Buffer.from(capture.data, "base64"),
        );
      }
      assert.notEqual(
        colors[0],
        colors[1],
        "theme palette must follow the provider",
      );
    }
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${results[0]?.length ?? 0} MRT caller snapshots and real control actions match: sorting, pagination, filter menus, selection/actions, grouping, focus and custom toolbar.`,
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
