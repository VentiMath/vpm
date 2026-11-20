"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { fixture, peer } = require("./paths.cjs"),
  base = fixture + "/node_modules/.vpm-material",
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-material-crumbs-"));
let server,
  child,
  socket,
  sequence = 0;
const pending = new Map(),
  exceptions = [];
(async () => {
  try {
    if (!process.env.VPM_MATERIAL_SKIP_BUILD) require("./breadcrumbs-build.cjs");
    server = http.createServer((req, res) => {
      const file = /^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
      if (file) {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(base + "/" + file[1] + "-" + file[2] + "/breadcrumbs-browser.js"));
        return;
      }
      const hydration = req.url.endsWith("-hydrate"),
        variant = req.url.slice(1).replace(/-hydrate$/, "") || "current-vpm";
      let markup = "",
        styles = "";
      if (hydration) {
        markup = require(base + "/" + variant + "/breadcrumbs-ssr.cjs").hydrate();
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
    const render = (props) =>
      evaluate("window.renderBreadcrumbs(" + JSON.stringify(props) + ");" + settle);
    const activate = async (key, code, n, text) => {
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key,
        code,
        windowsVirtualKeyCode: n,
        text,
      });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n });
      await evaluate(settle);
    };

    const snapshot = `(()=>{
      const nav=document.querySelector('#trail'), list=nav.querySelector('ol'), sep=list.querySelector('[aria-hidden=true].MuiBreadcrumbs-separator');
      const button=list.querySelector('button'),icon=button?.querySelector('svg');
      const css=getComputedStyle(nav), box=icon?.getBoundingClientRect();
      return {role:nav.tagName,name:nav.getAttribute('aria-label'), links:[...list.querySelectorAll('a')].map(a=>[a.textContent,a.getAttribute('href')]),
        separator:sep?.textContent,margin:sep&&getComputedStyle(sep).marginLeft,wrapping:getComputedStyle(list).flexWrap,
        listStyle:getComputedStyle(list).listStyleType,display:getComputedStyle(list).display,color:css.color,border:css.borderColor,
        button:button?.getAttribute('aria-label'),background:button&&getComputedStyle(button).backgroundColor,
        glyph:box&&[box.width,box.height]};
    })()`;
    for (const version of ["current", "app"]) {
      let control;
      for (const implementation of ["upstream", "vpm"]) {
        const name = version + "-" + implementation;
        await send("Page.navigate", { url: baseUrl + name });
        await wait('window.renderBreadcrumbs && document.querySelector("#trail")');
        const samples = [];
        for (const app of [false, true])
          for (const dark of [false, true])
            for (const count of [3, 4, 6]) {
              await render({ app, dark, rtl: dark, count, last: "Émilie du Châtelet" });
              const sample = await evaluate(snapshot);
              // VentiMath uses Material 7's palette-path color. Material 9 ignores
              // this syntax. Assert both behaviors before comparing shared geometry.
              const color =
                version === "current" && implementation === "upstream"
                  ? await evaluate(
                      'getComputedStyle(document.querySelector("#trail").parentElement).color',
                    )
                  : dark
                    ? "rgb(255, 255, 255)"
                    : "rgba(0, 0, 0, 0.54)";
              assert.equal(sample.color, color, name + " text color");
              assert.equal(sample.border, color, name + " inherited border");
              delete sample.color;
              delete sample.border;
              samples.push(sample);
            }
        if (implementation === "upstream") control = samples;
        else assert.deepEqual(samples, control, version + " caller styles, links and collapse states");
        await render({ count: 6, last: "Problem 7", expandText: "Afficher le chemin" });
        assert.equal(
          await evaluate('document.querySelector("#trail button").getAttribute("aria-label")'),
          "Afficher le chemin",
        );
        await evaluate(
          'window.firstCrumb=document.querySelector("#trail a");document.querySelector("#trail button").focus()',
        );
        await activate("Enter", "Enter", 13, "\r");
        await wait('!document.querySelector("#trail button")');
        assert.equal(await evaluate('document.querySelectorAll("#trail a").length'), 6);
        assert.equal(
          await evaluate(
            'document.activeElement===window.firstCrumb && document.querySelector("#trail a")===window.firstCrumb',
          ),
          true,
        );
        await render({ count: 6, last: "Renamed learner", skipHome: true });
        assert.equal(
          await evaluate('document.querySelector("#trail a:last-of-type")?.textContent'),
          "Contests",
        );
        assert.equal(
          await evaluate('[...document.querySelectorAll("#trail a")].at(-1).textContent'),
          "Renamed learner",
        );
        await send("Page.navigate", { url: baseUrl + name + "-hydrate" });
        await wait("window.hydrationReady");
        await evaluate(settle);
        assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydrated button")'), true);
        await evaluate('document.querySelector("#trail button").focus()');
        await activate(" ", "Space", 32, " ");
        await wait('document.querySelectorAll("#trail a").length===6');
      }
    }
    assert.deepEqual(exceptions, []);
    console.log(
      "Breadcrumb theme, links, expansion, keyboard focus, rerender and hydration pass on both controls",
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
