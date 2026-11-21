"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { fixture, peer } = require("./paths.cjs"),
  base = fixture + "/node_modules/.vpm-material",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-material-tabs-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    if (!process.env.VPM_MATERIAL_SKIP_BUILD) require("./tabs-build.cjs");
    server = http.createServer((req, res) => {
      const file = /^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
      if (file) {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(base + "/" + file[1] + "-" + file[2] + "/tabs-browser.js"));
        return;
      }
      const hydration = req.url.endsWith("-hydrate"),
        variant = req.url.slice(1).replace(/-hydrate$/, "") || "current-vpm";
      let markup = "",
        styles = "";
      if (hydration) {
        markup = require(base + "/" + variant + "/tabs-ssr.cjs").hydrate();
        markup = markup.replace(/<style[\s\S]*?<\/style>/g, (tag) => {
          styles += tag;
          return "";
        });
      }
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(
        '<!doctype html><html><head><meta charset="utf-8">' +
          styles +
          '</head><body style="margin:0">' +
          (hydration ? '<div id="hydration">' + markup + "</div>" : "") +
          '<script src="/' +
          variant +
          '.js"></script></body></html>',
      );
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
      ].find(fs.existsSync);
    let port;
    ({ child, port } = await require("../vlx-conformance/launch-chrome.cjs")(chrome, profile));
    const tabs = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
    socket = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r, j) => {
      socket.onopen = r;
      socket.onerror = j;
    });
    socket.onmessage = (e) => {
      const x = JSON.parse(e.data),
        p = pending.get(x.id);
      if (x.method === "Runtime.exceptionThrown") exceptions.push(x.params.exceptionDetails);
      if (x.method === "Runtime.consoleAPICalled" && x.params.type === "error")
        exceptions.push(x.params.args.map((a) => a.value || a.description).join(" "));
      if (p) {
        pending.delete(x.id);
        clearTimeout(p.timer);
        x.error ? p.reject(Error(JSON.stringify(x.error))) : p.resolve(x.result);
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence,
          timer = setTimeout(() => reject(Error("CDP timeout " + method)), 45000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }).catch(
        (e) => {
          throw Error(e.message + " while evaluating " + expression.slice(0, 240));
        },
      );
      assert.equal(r.exceptionDetails, undefined, JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    const settle =
      "(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()";
    const wait = (c) =>
      evaluate(
        `(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`,
      );
    await send("Runtime.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const baseUrl = "http://127.0.0.1:" + server.address().port + "/";
    const render = (props) => evaluate("window.renderTabs(" + JSON.stringify(props) + ");" + settle);
    const activate = async (key, code, n, text) => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n });
      await evaluate(settle);
    };
    const tabList = '[...document.querySelectorAll("#sample [role=tab]")]';
    const selection = () => evaluate(tabList + '.findIndex(t=>t.matches("[aria-selected=true]"))');
    const click = async (index) => {
      await evaluate(tabList + "[" + index + "].click()");
      await evaluate(settle);
    };
    const snapshot = `(()=>{
   const root=document.querySelector('#sample'),list=root.querySelector('[role=tablist]'),bar=root.querySelector('.MuiTabs-indicator');
   const tab=list.querySelector('[aria-selected=true]'),css=getComputedStyle(tab),style=getComputedStyle(bar);
   const box=tab.getBoundingClientRect(),b=bar.getBoundingClientRect(),vertical=list.getAttribute('aria-orientation')==='vertical';
   return {name:list.getAttribute('aria-label'),orientation:list.getAttribute('aria-orientation'),
     labels:Array.from(list.children,t=>[t.textContent,t.tabIndex,t.disabled,t.getAttribute('aria-selected')]),
     position:Math.round(vertical?b.top-box.top:b.left-box.left),length:Math.round(vertical?b.height:b.width),
     tabWidth:Math.round(box.width),tabHeight:Math.round(box.height),font:css.fontSize,padding:css.padding,color:css.color,
     rootPadding:getComputedStyle(root).padding,barColor:style.backgroundColor,barHeight:style.minHeight,barRadius:style.borderRadius};
 })()`;
    for (const version of ["current", "app"]) {
      let control;
      for (const implementation of ["upstream", "vpm"]) {
        const name = version + "-" + implementation;
        await send("Page.navigate", { url: baseUrl + name });
        await wait('window.renderTabs && document.querySelector("#sample")');
        const samples = [];
        for (const kind of ["imo", "family"])
          for (const app of [false, true])
            for (const vertical of [false, true]) {
              await render({
                kind,
                app,
                dark: app,
                orientation: vertical ? "vertical" : "horizontal",
                centered: true,
              });
              // The control schedules indicator measurement after React commits.
              // For standard tabs wait for the selected geometry itself.
              if (!app) await wait(`(()=>{const s=${snapshot};return Math.abs(s.position)<=1 && Math.abs(s.length-(${vertical}?s.tabHeight:s.tabWidth))<=1})()`);
              samples.push(await evaluate(snapshot));
            }
        if (implementation === "upstream") control = samples;
        else assert.deepEqual(samples, control, version + " tab geometry, colors and semantics");
        await render({});
        await evaluate("window.events=[]");
        await click(1);
        await click(3);
        await evaluate(tabList + "[3].focus()");
        await activate("Enter", "Enter", 13, "\r");
        assert.equal(await selection(), 1);
        assert.deepEqual(await evaluate("window.events"), [1, 3, 3]);
        await render({ disabled: true, initial: 0 });
        await evaluate(tabList + "[0].focus()");
        await activate("ArrowRight", "ArrowRight", 39);
        assert.equal(await evaluate("document.activeElement.textContent"), "Problems");
        assert.equal(await selection(), 0);
        await activate("Enter", "Enter", 13, "\r");
        assert.equal(await selection(), 2);
        await activate("End", "End", 35);
        await activate("ArrowRight", "ArrowRight", 39);
        assert.equal(await evaluate("document.activeElement.textContent"), "Countries");
        await activate("Home", "Home", 36);
        await render({ kind: "family", app: true });
        await click(0);
        await evaluate("window.saved=" + tabList + "[0];window.saved.focus()");
        await render({ kind: "family", app: true, reverse: true, long: true, tick: 1 });
        assert.equal(await selection(), 2);
        assert.equal(
          await evaluate(tabList + "[2]===window.saved && document.activeElement===window.saved"),
          true,
        );
        const moved = await evaluate(snapshot);
        assert.ok(Math.abs(moved.position) <= 1);
        assert.ok(Math.abs(moved.length - moved.tabWidth) <= 2);
        await render({ kind: "family", orientation: "vertical", selectionFollowsFocus: true });
        await evaluate(tabList + "[0].focus()");
        await activate("ArrowDown", "ArrowDown", 40);
        assert.equal(await selection(), 1);
        await render({ kind: "imo", rtl: true, app: true });
        await evaluate(tabList + "[0].focus()");
        await activate("ArrowLeft", "ArrowLeft", 37);
        assert.equal(await evaluate("document.activeElement.textContent"), "Contestants");
        await send("Page.navigate", { url: baseUrl + name + "-hydrate" });
        await wait("window.hydrationReady");
        await evaluate(settle);
        assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydrated")'), true);
      }
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Tab geometry, app theme, controlled changes, keyboard focus, learner identity and hydration pass on both controls",
    );
  } finally {
    require("./paths.cjs").esbuild.stop();
    socket?.close();
    child?.kill();
    server?.close();
    server?.closeAllConnections();
    for (const p of pending.values()) clearTimeout(p.timer);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})().catch((e) => {
  console.error(
    e,
    exceptions.map((item) => item.exception?.description || item),
  );
  process.exitCode = 1;
});
