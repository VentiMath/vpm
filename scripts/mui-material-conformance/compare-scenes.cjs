"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { fixture } = require("./paths.cjs"),
  base = fixture + "/node_modules/.vpm-material";
module.exports = async function compareScenes(unit, check) {
  const profile = fs.mkdtempSync(
    path.join(os.tmpdir(), "vpm-material-" + unit + "-"),
  );
  let server,
    child,
    socket,
    sequence = 0;
  const pending = new Map(),
    exceptions = [];
  try {
    if (!process.env.VPM_MATERIAL_SKIP_BUILD)
      require("./" + unit + "-build.cjs");
    server = http.createServer((req, res) => {
      const file = /^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
      if (file) {
        res.setHeader("content-type", "text/javascript");
        res.end(
          fs.readFileSync(
            base + "/" + file[1] + "-" + file[2] + "/" + unit + "-browser.js",
          ),
        );
        return;
      }
      const hydration = req.url.endsWith("-hydrate"),
        variant = req.url.slice(1).replace(/-hydrate$/, "") || "current-vpm";
      let markup = "",
        styles = "";
      if (hydration) {
        markup = require(
          base + "/" + variant + "/" + unit + "-ssr.cjs",
        ).hydrate();
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
    ({ child, port } = await require("../vlx-conformance/launch-chrome.cjs")(
      chrome,
      profile,
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
    socket.onmessage = (e) => {
      const x = JSON.parse(e.data),
        p = pending.get(x.id);
      if (x.method === "Runtime.exceptionThrown")
        exceptions.push(x.params.exceptionDetails);
      if (x.method === "Runtime.consoleAPICalled" && x.params.type === "error")
        exceptions.push(
          x.params.args.map((a) => a.value || a.description).join(" "),
        );
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
            () => reject(Error("CDP timeout " + method)),
            45000,
          );
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      }).catch((e) => {
        throw Error(
          e.message + " while evaluating " + expression.slice(0, 240),
        );
      });
      assert.equal(
        r.exceptionDetails,
        undefined,
        JSON.stringify(r.exceptionDetails),
      );
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
    await check({ send, wait, evaluate, settle, baseUrl });
    assert.deepEqual(exceptions, []);
  } finally {
    require("./paths.cjs").esbuild.stop();
    socket?.close();
    child?.kill();
    server?.close();
    server?.closeAllConnections();
    for (const p of pending.values()) clearTimeout(p.timer);
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};
