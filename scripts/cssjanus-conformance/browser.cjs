"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const load = require("./load.cjs"),
  entry =
    process.env.VPM_CSSJANUS_ENTRY ||
    path.resolve(__dirname, "../../packages/vcssjanus");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-cssjanus-chrome-"));
let child,
  socket,
  id = 0;
const pending = new Map();
(async () => {
  try {
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
      tabs.find((x) => x.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    socket.onmessage = (e) => {
      const x = JSON.parse(e.data),
        p = pending.get(x.id);
      if (p) {
        pending.delete(x.id);
        clearTimeout(p.timer);
        x.error
          ? p.reject(Error(JSON.stringify(x.error)))
          : p.resolve(x.result);
      }
    };
    const send = (method, params) =>
      new Promise((resolve, reject) => {
        const n = ++id,
          timer = setTimeout(() => reject(Error("CDP timeout")), 15000);
        pending.set(n, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: n, method, params }));
      });
    const css =
      '.card{position:relative;left:10px;right:auto;margin:1px 2px 3px 4px;padding-left:12px;padding-right:2px;border-radius:1px 2px 3px 4px;text-align:left;direction:ltr;box-shadow:3px 4px 5px red;transform:translateX(6px);background-position:20% 40%}.card:before{content:"left;right:{}"}.ignored{/*! @noflip */margin-left:7px;margin-right:2px}.logical{margin-inline-start:9px}';
    const correction =
      ".card{--left:right;background:url(a) 10% 20%/30% 40%,url(b) 25% 35%/45% 55%;box-shadow:1px 2px red,3px 4px blue}";
    const checks = [];
    for (const stylis of [require("stylis"), require("../../packages/vstylis")])
      for (const rtl of [false, true])
        for (const target of [require.resolve("cssjanus"), entry])
          checks.push({
            rtl,
            vpm: target === entry,
            css: load(target, stylis)(css, rtl),
          });
    checks.push({ correction: true, css: load(entry)(correction, true) });
    const r = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async()=>{
 const tests=${JSON.stringify(checks)},out=[];
 for(const test of tests){
 const frame=document.createElement('iframe');document.body.append(frame);
 frame.contentDocument.open();frame.contentDocument.write('<!doctype html><style>'+test.css+'</style><div class="card ignored logical">Card</div>');frame.contentDocument.close();
 const win=frame.contentWindow,el=frame.contentDocument.querySelector('.card'),s=win.getComputedStyle(el);
 const properties=['left','right','marginLeft','marginRight','paddingLeft','paddingRight','borderTopLeftRadius','borderTopRightRadius','textAlign','direction','boxShadow','transform','backgroundPosition'];
 const values=Object.fromEntries(properties.map(p=>[p,s[p]]));values.content=win.getComputedStyle(el,'::before').content;values.variable=s.getPropertyValue('--left');out.push(values);frame.remove();
 }return out;})()`,
    });
    assert.equal(
      r.exceptionDetails,
      undefined,
      JSON.stringify(r.exceptionDetails),
    );
    const out = r.result.value;
    for (let i = 0; i < 8; i += 2) {
      const a = { ...out[i] },
        b = { ...out[i + 1] };
      assert.equal(b.content, '"left;right:{}"');
      if (checks[i].rtl) assert.equal(a.content, '"right;right:{}"');
      delete a.content;
      delete b.content;
      assert.deepEqual(a, b);
      assert.equal(b.left, checks[i].rtl ? "-10px" : "10px");
      assert.equal(b.paddingLeft, checks[i].rtl ? "2px" : "12px");
      assert.equal(b.marginLeft, checks[i].rtl ? "2px" : "9px");
      assert.equal(b.marginRight, checks[i].rtl ? "9px" : "2px");
      assert.equal(b.direction, checks[i].rtl ? "rtl" : "ltr");
    }
    assert.equal(out[8].backgroundPosition, "90% 20%, 75% 35%");
    assert.equal(out[8].variable, "right");
    assert.match(out[8].boxShadow, /-1px 2px/);
    assert.match(out[8].boxShadow, /-3px 4px/);
    console.log(
      "Chrome: 8 LTR/RTL app-order middleware snapshots across upstream/VPM Stylis, quoted-content correction, logical properties and multilayer background/shadow fixes pass.",
    );
  } finally {
    socket?.close();
    if (child && child.exitCode === null) {
      const done = new Promise((r) => child.once("exit", r));
      child.kill("SIGKILL");
      await done;
    }
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
