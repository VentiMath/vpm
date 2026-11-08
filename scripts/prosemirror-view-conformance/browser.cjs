"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-readonly-chrome-"));
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
        res.end(fs.readFileSync(path.join(consumer, "dom-bundle.js")));
      } else {
        res.setHeader("Content-Type", "text/html");
        res.end(
          '<!doctype html><meta charset="utf-8"><style>body{font:15px/1.5 system-ui;margin:20px;color:#202124}#previews{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}section{min-width:0}h2{font-size:20px}p{margin:10px 0}pre{background:#f5f5f5;padding:10px}blockquote{border-left:3px solid #aaa;margin-left:0;padding-left:15px}ul[data-type=taskList]{list-style:none;padding-left:16px}li[data-type=taskItem]{display:flex;gap:8px}li[data-type=taskItem]>div{flex:1}li[data-type=taskItem] p{margin:0}img{max-width:100%}</style><script type="module" src="/bundle.js"></script>',
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1500,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
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
      snapshots: 14,
      updates: 120,
      positionFixtures: 22,
      identity: true,
      widgets: true,
      iframe: true,
      taskCheckboxesDisabled: true,
    });
    const evalPage = async (expression) => {
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
    if (process.env.VPM_GEOMETRY_PROBE) {
      fs.writeFileSync(
        process.env.VPM_GEOMETRY_PROBE,
        JSON.stringify(
          await evalPage(
            "Object.fromEntries(Object.entries(window.domVariants).map(([name,v])=>[name,v.geometry(true)]))",
          ),
          null,
          2,
        ),
      );
    }
    const geometry = await evalPage(`(() => {
      const results = Object.fromEntries(Object.entries(window.domVariants).map(([name, v]) => [name, v.geometry()]));
      let comparisons = 0;
      for (const variant of ['app', 'vpm']) {
        if(results[variant].length !== results.upstream.length) throw Error('Geometry fixture count');
        results.upstream.forEach((expected, index) => {
          const actual = results[variant][index];
          if(actual.label !== expected.label || actual.rows.length !== expected.rows.length) throw Error('Geometry fixture '+expected.label);
          expected.rows.forEach((row, i) => {
            const found = actual.rows[i];
            for (const key of ['left','right','top','bottom']) {
              if (!Number.isFinite(found.rect[key]) || Math.abs(found.rect[key]-row.rect[key]) > 0.05)
                throw Error(variant+' geometry '+expected.label+' pos '+row.pos+' side '+row.side+' '+key+': expected '+row.rect[key]+', received '+found.rect[key]);
            }
            comparisons++;
          });
        });
      }
      return {fixtures:results.upstream.length, comparisons};
    })()`);
    console.log(
      "Chrome caret rectangle comparisons:",
      JSON.stringify(geometry),
    );
    assert.equal(geometry.fixtures, 19);
    assert.ok(geometry.comparisons > 15000);
    const sizes = await evalPage(
      `Array.from(document.querySelectorAll('#previews .ProseMirror')).map(root=>Array.from(root.children).map(n=>({tag:n.tagName,width:Math.round(n.getBoundingClientRect().width),height:Math.round(n.getBoundingClientRect().height)})))`,
    );
    assert.deepEqual(sizes[0], sizes[1]);
    assert.deepEqual(sizes[0], sizes[2]);
    const box = await evalPage(
      `(()=>{const n=document.querySelector('[data-variant=vpm] input');const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,checked:n.checked};})()`,
    );
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: box.x,
      y: box.y,
      button: "left",
      clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: box.x,
      y: box.y,
      button: "left",
      clickCount: 1,
    });
    assert.equal(
      await evalPage(
        `document.querySelector('[data-variant=vpm] input').checked`,
      ),
      box.checked,
    );
    const before = await evalPage(
      `document.querySelector('[data-variant=vpm] .ProseMirror').innerHTML`,
    );
    const paragraph = await evalPage(
      `(()=>{const r=document.querySelector('[data-variant=vpm] p').getBoundingClientRect();return {x:r.x+20,y:r.y+8};})()`,
    );
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...paragraph,
      button: "left",
      clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...paragraph,
      button: "left",
      clickCount: 1,
    });
    await send("Input.insertText", { text: "SHOULD NOT EDIT" });
    assert.equal(
      await evalPage(
        `document.querySelector('[data-variant=vpm] .ProseMirror').innerHTML`,
      ),
      before,
    );
    if (process.env.VPM_DOM_SCREENSHOT) {
      const shot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      fs.writeFileSync(
        process.env.VPM_DOM_SCREENSHOT,
        Buffer.from(shot.data, "base64"),
      );
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome read-only schema, layout, identity, widget focus/position/cleanup, iframe, disabled task controls and noneditable input:",
      JSON.stringify(result.result.value),
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
