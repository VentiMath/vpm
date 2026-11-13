"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { peer } = require("./paths.cjs"),
  React = peer("react"),
  render = peer("react-dom/server").renderToString;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-material-browser-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    const base = process.env.VPM_MATERIAL_SKIP_BUILD
      ? require("./paths.cjs").fixture + "/node_modules/.vpm-material"
      : require("./build.cjs");
    server = http.createServer((req, res) => {
      const m = req.url.match(
        /^\/(current|app)-(upstream|vpm)(\/browser.js)?$/,
      );
      if (!m) {
        res.writeHead(404);
        res.end();
        return;
      }
      const name = m[1] + "-" + m[2];
      res.setHeader("Content-Type", m[3] ? "text/javascript" : "text/html");
      res.end(
        m[3]
          ? fs.readFileSync(base + "/" + name + "/browser.js")
          : '<!doctype html><meta charset="utf-8"><script defer src="/' +
              name +
              '/browser.js"></script>',
      );
    });
    await new Promise((r, j) => {
      server.once("error", j);
      server.listen(0, "127.0.0.1", r);
    });
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
    socket.onclose = () => {
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(Error("Chrome disconnected"));
      }
      pending.clear();
    };
    socket.onmessage = (e) => {
      const v = JSON.parse(e.data);
      if (v.method === "Runtime.exceptionThrown")
        exceptions.push(v.params.exceptionDetails);
      const p = pending.get(v.id);
      if (p) {
        pending.delete(v.id);
        clearTimeout(p.timer);
        v.error
          ? p.reject(Error(JSON.stringify(v.error)))
          : p.resolve(v.result);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence,
          timer = setTimeout(() => {
            pending.delete(id);
            reject(Error("Browser timeout " + method));
          }, 30000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      assert.equal(
        r.exceptionDetails,
        undefined,
        JSON.stringify(r.exceptionDetails),
      );
      return r.result.value;
    };
    const settle = "new Promise(r=>setTimeout(r,50))";
    const click = async (selector) =>
      evaluate(
        `document.querySelector(${JSON.stringify(selector)}).click();${settle}`,
      );
    const key = async (k, code, keyCode) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", {
          type,
          key: k,
          code,
          windowsVirtualKeyCode: keyCode,
          nativeVirtualKeyCode: keyCode,
        });
      await evaluate(settle);
    };
    await send("Runtime.enable");
    const results = {};
    for (const version of ["current", "app"])
      for (const kind of ["upstream", "vpm"]) {
        const name = version + "-" + kind;
        await send("Page.navigate", {
          url: "http://127.0.0.1:" + server.address().port + "/" + name,
        });
        await evaluate(
          `(async()=>{for(let i=0;i<150;i++){if(window.controls?.root.current)return;await new Promise(r=>setTimeout(r,20));}throw Error('Fixture not ready')})()`,
        );
        const events = [];
        await click("#normal");
        assert.deepEqual(await evaluate("window.controls.events.current"), [
          ["normal", "click"],
        ]);
        await click("#submit");
        await click("#disabled");
        await click("#disabled-link");
        await evaluate("document.querySelector('#non-native').focus()");
        await key("Enter", "Enter", 13);
        await key(" ", "Space", 32);
        await click("#route");
        await click('#exclusive button[value="language"]');
        await click('#exclusive button[value="language"]');
        await click('#multiple button[value="2"]');
        await click('#multiple button[value="1"]');
        await click('#multiple button[value="3"]');
        await click("#cancel-toggle");
        events.push(await evaluate("window.controls.events.current"));
        assert.deepEqual(
          events[0],
          [
            ["normal", "click"],
            ["submit", "submit"],
            ...(version === "app" && kind === "upstream"
              ? [["disabled-link", "click"]]
              : []),
            [
              "non-native",
              version === "app" && kind === "upstream" ? "keydown" : "click",
            ],
            [
              "non-native",
              version === "app" && kind === "upstream" ? "keyup" : "click",
            ],
            ["route", "click"],
            ["exclusive", "language"],
            ["exclusive", null],
            ["multiple", [1, 2]],
            ["multiple", [2]],
          ],
          name + " activation",
        );
        assert.deepEqual(
          await evaluate(
            `[...document.querySelectorAll('#multiple button')].map(e=>e.getAttribute('aria-pressed'))`,
          ),
          ["false", "true", "false"],
        );
        await evaluate(
          "window.controls.action.current.focusVisible();" + settle,
        );
        assert.equal(
          await evaluate(
            "document.activeElement.id==='normal' && document.activeElement.classList.contains('Mui-focusVisible')",
          ),
          true,
          name + " action focusVisible",
        );
        await evaluate(
          "window.savedNode=window.controls.root.current;window.renderCase({tick:1});" +
            settle,
        );
        assert.equal(
          await evaluate(
            "window.savedNode===window.controls.root.current && document.activeElement===window.savedNode",
          ),
          true,
          name + " DOM focus survives rerender",
        );
        assert.equal(
          await evaluate(
            "document.querySelectorAll('#scene .MuiTouchRipple-root').length",
          ),
          0,
          name + " inherited disabled ripple",
        );
        await evaluate(
          "window.savedLoading=document.querySelector('#loading');window.controls.setLoading(true);" +
            settle,
        );
        assert.equal(
          await evaluate(
            "window.savedLoading===document.querySelector('#loading') && window.savedLoading.disabled && !!window.savedLoading.querySelector('[role=progressbar]')",
          ),
          true,
          name + " loading node/semantics",
        );
        await click("#loading");
        assert.deepEqual(
          await evaluate("window.controls.events.current"),
          events[0],
          name + " loading suppresses click",
        );
        await evaluate("window.controls.setLoading(false);" + settle);
        const styles = [];
        for (const width of [420, 1200])
          for (const mode of ["light", "dark"])
            for (const rtl of [false, true])
              for (const variables of [false, true]) {
                await send("Emulation.setDeviceMetricsOverride", {
                  width,
                  height: 900,
                  deviceScaleFactor: 1,
                  mobile: false,
                });
                await evaluate(
                  "window.renderCase(" +
                    JSON.stringify({ mode, rtl, variables }) +
                    ");" +
                    settle,
                );
                const style = await evaluate(
                  `['normal','small','quiet','icon','fab','previous','next','selected-toggle'].map(id=>{const el=id==='selected-toggle'?document.querySelector('#multiple button[aria-pressed=true]'):document.getElementById(id),s=getComputedStyle(el);return {id,disabled:el.disabled,styles:Object.fromEntries(['fontSize','fontWeight','lineHeight','paddingTop','paddingRight','minHeight','minWidth','height','width','borderRadius','textTransform','color','backgroundColor','backgroundImage','borderTopWidth'].map(p=>[p,s[p]]))}})`,
                );
                const selected = style.find(
                  (row) => row.id === "selected-toggle",
                );
                assert.notEqual(
                  selected.styles.backgroundColor,
                  "rgba(0, 0, 0, 0)",
                  name + " selected toggle remains visible with CSS variables",
                );
                // Compare rendered color channels: relative colors and rgba have different
                // computed CSS spellings even when their pixels are identical.
                for (const row of style)
                  for (const prop of ["color", "backgroundColor"]) {
                    row.styles[prop] = await evaluate(
                      `(()=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=${JSON.stringify(row.styles[prop])};x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data]})()`,
                    );
                  }
                // Text widths depend on the host's default font; compare explicit dimensions,
                // padding, colors and app overrides. Intrinsic text width is outside the equality gate.
                for (const row of style) {
                  delete row.styles.width;
                  if (!["icon", "fab"].includes(row.id))
                    delete row.styles.height;
                }
                styles.push({ width, mode, rtl, variables, style });
              }
        if (process.env.VPM_MATERIAL_EVIDENCE) {
          fs.mkdirSync(process.env.VPM_MATERIAL_EVIDENCE, { recursive: true });
          await evaluate(
            "document.body.style.cssText='background:#181b22;color:#fff;padding:24px';document.getElementById('scene').style.cssText='display:flex;flex-direction:column;gap:12px;align-items:flex-start'",
          );
          const shot = await send("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: true,
          });
          fs.writeFileSync(
            path.join(process.env.VPM_MATERIAL_EVIDENCE, name + ".png"),
            Buffer.from(shot.data, "base64"),
          );
        }
        const api = require(base + "/" + name + "/ssr.cjs").buttons;
        const html = render(
          React.createElement(api.Button, { disableRipple: true }, "Hydrated"),
        );
        assert.deepEqual(
          await evaluate("window.checkHydration(" + JSON.stringify(html) + ")"),
          { same: true, errors: [] },
          name + " hydration",
        );
        assert.equal(
          await evaluate("window.checkRipple()"),
          true,
          name + " ripple feedback",
        );
        // Material9 emits real clicks for keyboard activation; Material7 forwards
        // keyboard events. Match the current event contract, compare legacy action counts.
        results[name] = {
          events: events.map((list) =>
            list
              .filter((event) => event[0] !== "disabled-link")
              .map((event) =>
                event[0] === "non-native" ? [event[0], "activation"] : event,
              ),
          ),
          styles,
        };
      }
    fs.writeFileSync(
      scratch + "/results.json",
      JSON.stringify(results, null, 2),
    );
    for (const version of ["current", "app"]) {
      assert.deepEqual(
        results[version + "-vpm"].events,
        results[version + "-upstream"].events,
      );
      for (let i = 0; i < results[version + "-vpm"].styles.length; i++)
        assert.deepEqual(
          results[version + "-vpm"].styles[i],
          results[version + "-upstream"].styles[i],
          version + " styles case " + i,
        );
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Chrome button family: keyboard, disabled/link/loading behavior, toggle selection, DOM focus, hydration, ripple and 32 theme/viewport style cases pass both controls",
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    socket?.close();
    child?.kill("SIGKILL");
    server?.closeAllConnections();
    server?.close();
    for (const p of pending.values()) clearTimeout(p.timer);
    if (process.exitCode) console.error("Evidence: " + scratch);
    else fs.rmSync(scratch, { recursive: true, force: true });
  }
})();
