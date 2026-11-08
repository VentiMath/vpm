"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const consumer = path.resolve(process.argv[2]),
  profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-widget-chrome-"));
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
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
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
    const settle =
      "new Promise(r=>requestAnimationFrame(()=>setTimeout(r,30)))";
    const key = async (key, code) => {
      await send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key,
        code: key,
        windowsVirtualKeyCode: code,
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code: key,
        windowsVirtualKeyCode: code,
      });
      await evaluate(settle);
    };
    // Type each key separately: replacing the entire input in one event missed
    // highlight resets when filtering changes and then retains a nonempty list.
    let typingCases = 0;
    for (const query of ["usamts", "amc", "putnam", "arml", "usam", "a"])
      for (const action of ["enter", "arrows"]) {
        const pairs = [];
        for (const variant of ["upstream", "vpm"]) {
          const v = JSON.stringify(variant),
            states = [];
          await evaluate(`window['mount_'+${v}]({navigation:true});${settle}`);
          await evaluate(
            `document.getElementById(${v}+'-input').focus();${settle}`,
          );
          for (const character of query) {
            await send("Input.insertText", { text: character });
            await evaluate("new Promise(r=>setTimeout(r,80))");
            const state = await evaluate(`window.snapshot(${v})`);
            delete state.forwarded;
            states.push(state);
          }
          if (action === "arrows")
            for (const [name, code] of [
              ["ArrowDown", 40],
              ["ArrowUp", 38],
              ["ArrowUp", 38],
            ]) {
              await key(name, code);
              const state = await evaluate(`window.snapshot(${v})`);
              delete state.forwarded;
              states.push(state);
            }
          // Return to the automatic first result, then verify Enter selection.
          if (action === "arrows") await key("ArrowDown", 40);
          await key("Enter", 13);
          states.push(
            await evaluate(`window.logs[${v}].filter(x=>x[0]==='select')`),
          );
          pairs.push(states);
        }
        assert.deepEqual(
          pairs[1],
          pairs[0],
          "incremental navigation query: " + query + " " + action,
        );
        assert.equal(
          pairs[1][query.length - 1].active,
          pairs[1][query.length - 1].options[0].text,
        );
        typingCases++;
      }
    const reports = [];
    for (const options of [
      {},
      { minimum: 2 },
      { first: false },
      { grouped: true },
      { always: true },
      { async: true },
      { focus: false },
      { autoFocus: true },
      { portal: false },
    ]) {
      const pair = [];
      for (const variant of ["upstream", "vpm"]) {
        const v = JSON.stringify(variant);
        await evaluate(
          `window['mount_'+${v}](${JSON.stringify(options)});${settle}`,
        );
        await evaluate(
          `document.getElementById(${v}+'-input').focus();${settle}`,
        );
        const states = [];
        const capture = async (label) =>
          states.push({
            label,
            snapshot: await evaluate(`window.snapshot(${v})`),
            logs: await evaluate(`window.logs[${v}].slice()`),
          });
        await capture("focused");
        await send("Input.insertText", { text: "Al" });
        await evaluate(settle);
        await capture("typed");
        if (options.async) {
          await evaluate(
            `window.controls[${v}].update(window.controls[${v}].rows.slice(0,2));${settle}`,
          );
          await capture("delivered");
        }
        await evaluate(
          `window.saved=document.getElementById(${v}+'-input');window.savedItem=document.querySelector('#'+${v}+'-portal [role=option]');window.controls[${v}].rerender();${settle}`,
        );
        assert.equal(
          await evaluate(
            `window.saved===document.getElementById(${v}+'-input')&&document.activeElement===window.saved&&window.savedItem===document.querySelector('#'+${v}+'-portal [role=option]')`,
          ),
          true,
          variant + " DOM retention",
        );
        for (const [name, code] of [
          ["ArrowDown", 40],
          ["ArrowDown", 40],
          ["ArrowUp", 38],
          ["Escape", 27],
          ["Escape", 27],
          ["ArrowDown", 40],
        ]) {
          await key(name, code);
          await capture(name);
        }
        await send("Input.insertText", { text: "Ca" });
        await evaluate(settle);
        if (options.async)
          await evaluate(
            `window.controls[${v}].update(window.controls[${v}].rows.slice(3,5));${settle}`,
          );
        await key("Enter", 13);
        await capture("selected");
        pair.push(states);
      }
      reports.push({ options, pair });
    }
    fs.writeFileSync(
      path.join(consumer, "observations.json"),
      JSON.stringify(reports, null, 2),
    );
    let snapshots = 0;
    for (const { options, pair } of reports)
      for (let i = 0; i < pair[0].length; i++) {
        const expected = pair[0][i],
          actual = pair[1][i];
        // Forwarding the caller ref is checked independently; upstream overrides it.
        delete expected.snapshot.forwarded;
        delete actual.snapshot.forwarded;
        for (const state of [expected, actual]) {
          let last = Symbol();
          state.logs = state.logs.filter((row) => {
            if (row[0] !== "highlight") return true;
            if (row[1] === last) return false;
            last = row[1];
            return true;
          });
        }
        // Upstream omits the null notification when a grouped list becomes empty.
        // VPM explicitly clears it (checked below), while other callbacks match.
        if (options.grouped)
          for (const state of [expected, actual])
            state.logs = state.logs.filter(
              (row) => !(row[0] === "highlight" && row[1] === null),
            );
        assert.deepEqual(
          actual,
          expected,
          JSON.stringify({ options, step: i }),
        );
        snapshots++;
      }
    let edgeCases = 0;
    for (const options of [
      {},
      { focus: false },
      { keep: true },
      { grouped: true, emptySection: true },
    ]) {
      for (const variant of ["upstream", "vpm"]) {
        const v = JSON.stringify(variant);
        await evaluate(
          `window['mount_'+${v}](${JSON.stringify({ ...options, value: "Ca" })});${settle}`,
        );
        await evaluate(
          `document.getElementById(${v}+'-input').focus();${settle}`,
        );
        const point = await evaluate(
          `(()=>{const node=document.querySelector('#'+${v}+'-portal [data-suggestion-index="1"]');node.scrollIntoView();const r=node.getBoundingClientRect();return {x:r.left+10,y:r.top+r.height/2}})()`,
        );
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          ...point,
        });
        await evaluate(settle);
        await send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          button: "left",
          clickCount: 1,
          ...point,
        });
        await send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          button: "left",
          clickCount: 1,
          ...point,
        });
        await evaluate(settle);
        const snapshot = await evaluate(`window.snapshot(${v})`),
          logs = await evaluate(`window.logs[${v}]`);
        assert.equal(snapshot.value, "Campus");
        assert.equal(snapshot.focused, options.focus !== false);
        assert.deepEqual(
          logs.filter((row) => row[0] === "select"),
          [
            [
              "select",
              "Campus",
              "Campus",
              1,
              options.grouped ? 1 : null,
              "click",
            ],
          ],
        );
        if (variant === "vpm" && options.keep)
          assert.equal(snapshot.expanded, "true");
        edgeCases++;
      }
    }
    // Corrections use explicit assertions instead of making the oracle agree
    // with upstream's invalid grouped active-descendant or composition submit.
    await evaluate(
      `window.mount_vpm({grouped:true,emptySection:true,value:'Al'});${settle}`,
    );
    await evaluate(`document.getElementById('vpm-input').focus();${settle}`);
    assert.equal((await evaluate(`window.snapshot('vpm')`)).active, "Algebra");
    await key("ArrowDown", 40);
    assert.equal(
      (await evaluate(`window.snapshot('vpm')`)).active,
      "Algorithms",
    );
    await evaluate(`window.controls.vpm.update([]);${settle}`);
    assert.equal((await evaluate(`window.snapshot('vpm')`)).active, null);
    assert.deepEqual(
      (await evaluate(`window.logs.vpm.filter(x=>x[0]==='highlight')`)).at(-1),
      ["highlight", null],
    );
    await evaluate(`window.mount_vpm({value:'Al'});${settle}`);
    await evaluate(`document.getElementById('vpm-input').focus();${settle}`);
    await evaluate(
      `document.getElementById('vpm-input').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'Al'}));`,
    );
    await key("Enter", 13);
    assert.equal(
      (await evaluate(`window.logs.vpm.filter(x=>x[0]==='select')`)).length,
      0,
    );
    await evaluate(
      `document.getElementById('vpm-input').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'Al'}));`,
    );
    await key("Enter", 13);
    assert.equal(
      (await evaluate(`window.logs.vpm.filter(x=>x[0]==='select')`)).length,
      1,
    );
    await evaluate(`window.mount_vpm({value:'Al',async:true});${settle}`);
    await evaluate(`document.getElementById('vpm-input').focus();${settle}`);
    await evaluate(`document.getElementById('vpm-input').blur();${settle}`);
    await evaluate(
      `window.controls.vpm.update(window.controls.vpm.rows);${settle}`,
    );
    assert.equal((await evaluate(`window.snapshot('vpm')`)).expanded, "false");
    assert.equal((await evaluate(`window.snapshot('vpm')`)).forwarded, true);
    await evaluate(`window.mount_vpm({cleanupRef:true});${settle}`);
    await evaluate(`window.controls.vpm.rerender();${settle}`);
    assert.deepEqual(
      await evaluate(`window.logs.vpm.filter(x=>x[0].includes('ref'))`),
      [["input-ref", true, 0]],
    );
    await evaluate(`window.controls.vpm.root.render(null);${settle}`);
    assert.deepEqual(
      await evaluate(`window.logs.vpm.filter(x=>x[0].includes('ref'))`),
      [
        ["input-ref", true, 0],
        ["ref-cleanup", 0],
      ],
    );
    await evaluate(`window.mount_vpm({cleanupRef:true});${settle}`);
    await evaluate(`window.controls.vpm.swapRef();${settle}`);
    assert.deepEqual(
      await evaluate(`window.logs.vpm.filter(x=>x[0].includes('ref'))`),
      [
        ["input-ref", true, 0],
        ["ref-cleanup", 0],
        ["input-ref", true, 1],
      ],
    );
    await evaluate(`window.controls.vpm.root.render(null);${settle}`);
    assert.deepEqual(
      (await evaluate(`window.logs.vpm.filter(x=>x[0].includes('ref'))`)).at(
        -1,
      ),
      ["ref-cleanup", 1],
    );
    edgeCases += 6;
    assert.deepEqual(exceptions, []);
    console.log(
      `Chrome: ${typingCases} incremental navigation queries; ${snapshots} controlled-input, keyboard, ARIA, custom portal and result-update snapshots/callback traces match; ${edgeCases} mouse, IME, delayed-result and empty-group cases pass.`,
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
