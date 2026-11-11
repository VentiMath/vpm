"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = __dirname + "/node_modules/.vpm-scrollbar",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-scrollbar-chrome-"));
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
      if (/^\/(upstream|vpm)\/browser-entry.js$/.test(req.url)) {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(consumer, req.url)));
        return;
      }
      if (/^\/(upstream|vpm)\/scrollbar.css$/.test(req.url)) {
        res.setHeader("content-type", "text/css");
        res.end(fs.readFileSync(path.join(consumer, req.url)));
        return;
      }
      if (/^\/(upstream|vpm)$/.test(req.url)) {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="' +
            req.url +
            '/scrollbar.css"><script type="module" src="' +
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
    for (const width of [390, 1024]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false,
      });
      let baseline;
      for (const variant of ["upstream", "vpm"]) {
        await send("Page.navigate", {
          url: "http://127.0.0.1:" + server.address().port + "/" + variant,
        });
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 40,
          y: 40,
        });
        const result = await send("Runtime.evaluate", {
          expression: `(async()=>{for(let i=0;i<250;i++){if(window.scrollbarVariant===${JSON.stringify(variant)} && window.runScrollbars)return await window.runScrollbars();await new Promise(r=>setTimeout(r,20));}throw Error('Fixture unavailable')})()`,
          awaitPromise: true,
          returnByValue: true,
        });
        assert.equal(
          result.exceptionDetails,
          undefined,
          JSON.stringify({ error: result.exceptionDetails, exceptions }),
        );
        if (!baseline) baseline = result.result.value;
        else
          assert.deepEqual(
            result.result.value,
            baseline,
            variant + " at " + width,
          );
        await send("Runtime.evaluate", {
          expression: "window.prepareKeyboard()",
        });
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 50,
          y: 50,
        });
        await send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
          nativeVirtualKeyCode: 40,
        });
        await send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
          nativeVirtualKeyCode: 40,
        });
        const keyed = await send("Runtime.evaluate", {
          expression: "window.finishKeyboard()",
          returnByValue: true,
        });
        assert.equal(keyed.exceptionDetails, undefined);
        assert.equal(keyed.result.value, 30, variant + " native keyboard");
        const point = (
          await send("Runtime.evaluate", {
            expression: "window.prepareDrag()",
            returnByValue: true,
          })
        ).result.value;
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: point.x,
          y: point.y,
        });
        await send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: point.x,
          y: point.y,
          button: "left",
          clickCount: 1,
        });
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: point.x,
          y: point.y + 50,
          buttons: 1,
        });
        await send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: point.x,
          y: point.y + 50,
          button: "left",
          clickCount: 1,
        });
        const dragged = await send("Runtime.evaluate", {
          expression: "window.finishDrag()",
          returnByValue: true,
        });
        assert.equal(
          dragged.exceptionDetails,
          undefined,
          JSON.stringify(dragged.exceptionDetails),
        );
        assert.equal(dragged.result.value, 200);
        if (variant === "vpm") {
          const check = await send("Runtime.evaluate", {
            expression: "window.checkOwnership()",
            awaitPromise: true,
            returnByValue: true,
          });
          assert.equal(
            check.exceptionDetails,
            undefined,
            JSON.stringify({ error: check.exceptionDetails, exceptions }),
          );
          assert.equal(check.result.value, true);
        }
      }
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome: scrollbar geometry, wheel, keys, rail clicks, real thumb dragging and caller cleanup match upstream; automatic updates, RTL and iframe checks pass.",
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
