"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-list-chrome-"));
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
    assert.deepEqual(result.result.value, {
      variants: 3,
      snapshots: 12,
    });
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
    const snapshots = [];
    for (const variant of ["upstream", "app", "vpm"]) {
      await evaluate(
        `window.listVariants[${JSON.stringify(variant)}].prepare()`,
      );
      const states = [];
      const capture = async () =>
        states.push(
          await evaluate(
            `window.listVariants[${JSON.stringify(variant)}].snapshot()`,
          ),
        );
      await capture();
      for (const [key, code, num, modifiers] of [
        ["Tab", "Tab", 9, 0],
        ["Tab", "Tab", 9, 8],
        ["Enter", "Enter", 13, 0],
      ]) {
        for (const type of ["rawKeyDown", "keyUp"])
          await send("Input.dispatchKeyEvent", {
            type,
            key,
            code,
            windowsVirtualKeyCode: num,
            modifiers,
          });
        await capture();
      }
      await send("Input.insertText", { text: "typed" });
      await evaluate(
        "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
      );
      await capture();
      assert.equal(
        states[1].doc.content[0].content[0].content[1].type,
        "bulletList",
      );
      assert.equal(states[2].doc.content[0].content.length, 3);
      assert.equal(states[3].doc.content[0].content.length, 4);
      assert.equal(states[4].text, "alphabetatypedgamma");
      assert(
        states[4].events.length === 3 &&
          states[4].events.every((e) => e.trusted && e.prevented),
      );
      snapshots.push(states);
    }
    assert.deepEqual(snapshots[0], snapshots[1]);
    assert.deepEqual(snapshots[0], snapshots[2]);
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome: current/app/VPM Tiptap list graphs match 12 API snapshots, task-list commands and trusted Tab/Shift-Tab/Enter/typing.",
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
