"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-swipeable-chrome-"));
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

    await send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    let cases = 0;
    for (const settings of [
      {},
      { delta: 30 },
      { delta: { left: 45, right: 5 } },
      { rotationAngle: 90 },
      { rotationAngle: 37 },
      { swipeDuration: 15 },
      { trackMouse: true, trackTouch: false },
      { preventScrollOnSwipe: true },
    ])
      for (const [dx, dy] of [
        [60, 0],
        [-60, 0],
        [0, 60],
        [0, -60],
        [4, 3],
        [10, 10],
      ]) {
        const outputs = [];
        for (const variant of ["upstream", "vpm"])
          outputs.push(
            await evaluate(
              `(()=>{const c=window.swipeControls[${JSON.stringify(variant)}];c.set(${JSON.stringify(settings)});return c.gesture([[100,100,100],[${100 + dx},${100 + dy},110],[${100 + dx * 2},${100 + dy * 2},120],[0,0,125]],{mouse:${!!settings.trackMouse}})})()`,
            ),
          );
        if (settings.swipeDuration === 15) {
          assert(outputs[0].logs.some((x) => x.name === "onTap"));
          assert(!outputs[1].logs.some((x) => x.name === "onTap"));
          outputs[0].logs = outputs[0].logs.filter((x) => x.name !== "onTap");
        }
        assert.deepEqual(outputs[1], outputs[0]);
        cases++;
      }
    // These options match the source-audited configurator and messenger callers.
    let appCases = 0;
    for (const app of ["configurator", "messenger"])
      for (const direction of ["ltr", "rtl"])
        for (const dx of [-80, 80]) {
          const outputs = [];
          for (const variant of ["upstream", "vpm"])
            outputs.push(
              await evaluate(
                `(()=>{const c=window.swipeControls[${JSON.stringify(variant)}];c.set({app:${JSON.stringify(app)},direction:${JSON.stringify(direction)},callbackKeys:[]});return c.gesture([[100,100,1],[${100 + dx},100,10],[0,0,20]])})()`,
              ),
            );
          assert.deepEqual(outputs[1], outputs[0]);
          assert.equal(
            outputs[1].open,
            !(direction === "ltr" ? dx > 0 : dx < 0),
          );
          appCases++;
        }
    async function touch(variant, dx, dy) {
      const r = await evaluate(`window.swipeControls.${variant}.rect()`),
        x = r.x + 140,
        y = r.y + 150;
      await send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let i = 1; i <= 6; i++)
        await send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + (dx * i) / 6, y: y + (dy * i) / 6, id: 1 }],
        });
      await send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await evaluate("new Promise(r=>setTimeout(r,100))");
    }
    for (const variant of ["upstream", "vpm"]) {
      await evaluate(
        `window.swipeControls.${variant}.set({app:'configurator',direction:'ltr',callbackKeys:[]})`,
      );
      await touch(variant, 0, -100);
      assert(
        (await evaluate(`window.swipeControls.${variant}.scroll()`)) > 30,
        "default native vertical scrolling " + variant,
      );
      assert.equal(
        await evaluate(`window.swipeControls.${variant}.open()`),
        true,
      );
      await evaluate(
        `window.swipeControls.${variant}.set({app:'messenger',direction:'ltr',callbackKeys:[]})`,
      );
      await touch(variant, 100, 0);
      assert.equal(
        await evaluate(`window.swipeControls.${variant}.open()`),
        false,
        "trusted swipe closes app caller " + variant,
      );
      await evaluate(
        `window.swipeControls.${variant}.set({preventScrollOnSwipe:true,callbackKeys:['onSwipedUp']})`,
      );
      await touch(variant, 0, -100);
      assert.equal(
        await evaluate(`window.swipeControls.${variant}.scroll()`),
        0,
        "explicit matched-direction scroll prevention " + variant,
      );
    }
    await evaluate(`window.swipeControls.vpm.set({trackMouse:true})`);
    const r = await evaluate("window.swipeControls.vpm.rect()");
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: r.x + 80,
      y: r.y + 80,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: r.x + 80,
      y: r.y + 80,
      button: "left",
      clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: r.x + 140,
      y: r.y + 80,
      button: "left",
      buttons: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: r.x + 140,
      y: r.y + 80,
      button: "left",
      clickCount: 1,
    });
    assert(
      (await evaluate("window.swipeControls.vpm.logs()")).some(
        (x) => x.name === "onSwipedRight",
      ),
      "trusted mouse swipe",
    );
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${cases} gesture payload comparisons (six explicit expired-tap corrections), ${appCases} app direction/close contracts, trusted touch native scrolling/prevention and trusted mouse input pass.`,
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
