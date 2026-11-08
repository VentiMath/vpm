"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-section-chrome-"));
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
            15000,
          );
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    await send("Runtime.enable");
    await send("Page.navigate", {
      url: "http://127.0.0.1:" + server.address().port,
    });
    const result = await send("Runtime.evaluate", {
      expression:
        '(async()=>{for(let i=0;i<200;i++){if(window.runChecks)return await window.runChecks();await new Promise(r=>setTimeout(r,20));}throw Error("Fixture did not load")})()',
      awaitPromise: true,
      returnByValue: true,
    });
    assert.equal(
      result.exceptionDetails,
      undefined,
      JSON.stringify({ evaluation: result.exceptionDetails, exceptions }),
    );
    assert.equal(result.result.value, true);
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      assert.equal(
        r.exceptionDetails,
        undefined,
        JSON.stringify(r.exceptionDetails),
      );
      return r.result.value;
    };
    let total = 0;
    for (const [counts, multi] of [
      [0, false],
      [1, false],
      [10, false],
      [[0, 2, 0, 1, 0], true],
      [[0, 0], true],
    ]) {
      const traces = [];
      for (const variant of ["upstream", "vpm"]) {
        await evaluate(
          `window.sectionControls[${JSON.stringify(variant)}].reset(${JSON.stringify(counts)},${multi});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`,
        );
        await evaluate(
          `document.getElementById(${JSON.stringify(variant)}).focus()`,
        );
        const trace = [];
        for (const keyCode of [...Array(13).fill(40), ...Array(13).fill(38)]) {
          const key = keyCode === 40 ? "ArrowDown" : "ArrowUp";
          await send("Input.dispatchKeyEvent", {
            type: "rawKeyDown",
            key,
            code: key,
            windowsVirtualKeyCode: keyCode,
          });
          await send("Input.dispatchKeyEvent", {
            type: "keyUp",
            key,
            code: key,
            windowsVirtualKeyCode: keyCode,
          });
          trace.push(
            await evaluate(
              `new Promise(r=>requestAnimationFrame(()=>r(window.sectionStates[${JSON.stringify(variant)}].position)))`,
            ),
          );
          total++;
        }
        const events = await evaluate(
          `window.sectionStates[${JSON.stringify(variant)}].events`,
        );
        assert.equal(events.length, 26);
        assert(events.every((e) => e.trusted));
        traces.push(trace);
      }
      assert.deepEqual(traces[1], traces[0]);
      if (!multi && counts === 10)
        assert.deepEqual(traces[1].slice(0, 12), [
          ...Array.from({ length: 10 }, (_, i) => [null, i]),
          [null, null],
          [null, 0],
        ]);
      if (multi && counts.length === 5)
        assert.deepEqual(traces[1].slice(0, 5), [
          [1, 0],
          [1, 1],
          [3, 0],
          [null, null],
          [1, 0],
        ]);
    }
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${total} trusted ArrowUp/ArrowDown events through actual autosuggest input; empty lists, section boundaries and sentinel wraparound match upstream.`,
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
