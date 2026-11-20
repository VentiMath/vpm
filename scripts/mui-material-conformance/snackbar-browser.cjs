"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { fixture, peer } = require("./paths.cjs"),
  base = fixture + "/node_modules/.vpm-material",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-material-snackbar-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    if (!process.env.VPM_MATERIAL_SKIP_BUILD) require("./snackbar-build.cjs");
    server = http.createServer((req, res) => {
      const file = /^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
      if (file) {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(base + "/" + file[1] + "-" + file[2] + "/snackbar-browser.js"));
        return;
      }
      const hydration = req.url.endsWith("-hydrate"),
        variant = req.url.slice(1).replace(/-hydrate$/, "") || "current-vpm";
      let markup = "",
        styles = "";
      if (hydration) {
        markup = require(base + "/" + variant + "/snackbar-ssr.cjs").hydrate();
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
      const r = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      }).catch((e) => {
        throw Error(e.message + " while evaluating " + expression.slice(0, 240));
      });
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
    for (const name of ["app-upstream","app-vpm","current-upstream","current-vpm"]) {
      await send("Page.navigate",{url:baseUrl+name});
      await wait("window.draw");
      const alert = 'document.querySelector("[role=alert]")';
      const flush = expression => evaluate(expression + ";" + settle);
      const tick = async ms => {
        const clock = await evaluate("clock()");
        assert.equal(clock.length,1,name);
        assert.equal(clock[0][1],ms,name);
        return clock[0][0];
      };
      await flush('document.querySelector("#copy").click()');
      assert.equal(await evaluate(alert+'.textContent'), "Link copied to clipboardUndo");
      const position = await evaluate('(()=>{const cs=getComputedStyle(document.querySelector(".MuiSnackbar-root"));return [cs.position,cs.bottom,cs.left,matchMedia("(min-width:600px)").matches]})()');
      assert.deepEqual(position.slice(0,3), ["fixed",position[3] ? "24px":"8px",position[3] ? "24px":"8px"]);
      assert.equal(await evaluate('getComputedStyle('+alert+').backgroundColor'), "rgb(50, 50, 50)");
      const first = await tick(2000);
      await flush("draw()");
      assert.equal(await tick(2000),first, name+" parent rerender");
      await flush(alert+'.querySelector("button").focus()');
      assert.deepEqual(await evaluate("clock()"),[]);
      await flush('document.querySelector("#copy").focus()');
      await flush('fire('+await tick(1000)+')');
      await wait("!"+alert);
      assert.deepEqual(await evaluate("reasons"),["timeout"]);
      await flush("draw({resumeHideDuration:700})");
      await flush('window.dispatchEvent(new Event("blur"))');
      assert.deepEqual(await evaluate("clock()"),[]);
      await flush('window.dispatchEvent(new Event("focus"))');
      await tick(700);
      await flush(alert+'.click()');
      assert.deepEqual(await evaluate("reasons"),["timeout"]);
      await flush('document.body.click()');
      await wait("!"+alert);
      await flush("draw()");
      await flush('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
      await wait("!"+alert);
      assert.deepEqual(await evaluate("reasons"),["timeout","clickaway","escapeKeyDown"]);
      await flush("draw()");
      await flush('draw({open:false, transitionDuration:120});draw({open:true,transitionDuration:120})');
      await evaluate('new Promise(r=>setTimeout(r,150))');
      assert.equal(await evaluate('Boolean('+alert+')'),true,name+" reopen during exit");
      await tick(2000);
      await flush("unmountNotice()");
      assert.deepEqual(await evaluate("clock()"),[]);
      await send("Page.navigate",{url:baseUrl+name+"-hydrate"});
      await wait("window.hydrationReady");
      await evaluate(settle);
      assert.equal(await evaluate("window.beforeHydration === "+alert),true,name+" hydrated alert");
    }
    assert.deepEqual(exceptions, []);
    console.log("Snackbar clipboard, timeout, focus, window pause, click-away, escape and hydration match both controls.");
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
