"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-highlight-chrome-"));
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

    let snapshots = 0;
    for (const input of [
      { text: "Algebra study guide", query: "study" },
      { text: "Algebra study guide", query: "guide algebra", exact: false },
      { text: "Algebra study guide", query: "guide algebra", exact: true },
      { text: "A+B practice", query: "a+b", column: true },
      { text: 2026, query: 2026 },
      { text: "Algebra study guide", query: "study", disabled: true },
      { text: "<b>literal & text</b>", query: "literal", custom: true },
      { text: "😀 contest 😀", query: "😀" },
      { text: "Algebra study guide", query: "" },
      { text: "Algebra study guide", query: "missing" },
    ]) {
      for (const variant of ["upstream", "vpm"])
        await evaluate(
          `window.highlightControls[${JSON.stringify(variant)}].set(${JSON.stringify(input)})`,
        );
      const outputs = await evaluate(
        `['upstream','vpm'].map(v=>{const h=document.getElementById(v);return {html:h.innerHTML,label:h.querySelector('[role=note]')?.getAttribute('aria-label'),colors:[...h.querySelectorAll('span span')].map(x=>getComputedStyle(x).backgroundColor)}})`,
      );
      assert.deepEqual(outputs[1], outputs[0]);
      snapshots++;
    }
    for (const variant of ["upstream", "vpm"]) {
      await evaluate(
        `window.highlightControls[${JSON.stringify(variant)}].set({text:'Algebra study guide',query:'study'})`,
      );
      const kept = await evaluate(
        `(()=>{const host=document.getElementById(${JSON.stringify(variant)}),before=[...host.querySelectorAll('[aria-hidden]')];window.highlightControls[${JSON.stringify(variant)}].rerender();return before.every((node,i)=>node===host.querySelectorAll('[aria-hidden]')[i])})()`,
      );
      assert.equal(
        kept,
        variant === "vpm",
        "unchanged chunk identity " + variant,
      );
    }
    await evaluate(
      `window.highlightControls.vpm.set({text:'aaa aa',query:'a',exact:false})`,
    );
    assert.deepEqual(
      await evaluate(
        `(()=>{const h=document.getElementById('vpm');return {text:h.textContent,highlighted:[...h.querySelectorAll('[aria-hidden]')].filter(x=>getComputedStyle(x).backgroundColor==='rgb(255, 207, 51)').map(x=>x.textContent).join('')}})()`,
      ),
      { text: "aaa aa", highlighted: "aaaaa" },
    );
    await evaluate(`window.highlightControls.upstream.set({text:'aaa aa',query:'a',exact:false})`);
    assert.equal(await evaluate(`[...document.getElementById('upstream').querySelectorAll('[aria-hidden]')].filter(x=>getComputedStyle(x).backgroundColor==='rgb(255, 207, 51)').map(x=>x.textContent).join('')`),'aaa','upstream negative control misses two adjacent matches');
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${snapshots} actual MRT cell text/markup/ARIA/color snapshots match; stable chunk identity and all-adjacent-match fixes verified against failing upstream controls.`,
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
