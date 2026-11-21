"use strict";
const assert = require("node:assert/strict");
const callbacks =
  process.env.VPM_APP_CHECKOUT &&
  require("./app-click-away.cjs")(
    process.env.VPM_APP_CHECKOUT,
    process.env.VPM_APP_REF,
  );
require("./compare-scenes.cjs")(
  "click-away",
  async ({ send, evaluate, wait, baseUrl }) => {
    for (const version of ["app", "current"])
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant });
        await wait(
          "typeof window.draw==='function' && location.pathname==='/" +
            variant +
            "'",
        );
        for (const framed of [false, true]) {
          await evaluate(
            "window.mount(" +
              framed +
              ");window.draw();window.fire('outside');",
          );
          assert.ok(
            !(await evaluate("window.take()")).includes("close:click"),
            variant + " opening event",
          );
          await evaluate("new Promise(r=>setTimeout(r,20))");
          const actions = async (js, want) =>
            assert.deepEqual(
              await evaluate(
                js + ";window.take().filter(x=>!['ref','cleanup'].includes(x))",
              ),
              want,
              variant + " " + js,
            );
          await actions(
            "window.fire('toggle');window.fire('suggestion');window.fire('outside')",
            ["child", "child", "close:click"],
          );
          if (framed) await actions("window.fire('outer')", []);
          await actions(
            "window.fire('outside','touchmove');window.fire('outside','touchend');window.fire('outside','touchend')",
            ["close:touchend"],
          );
          await actions("window.fire('outside','click',{clientX:99999})", []);
          await actions(
            "window.draw({disableReactTree:true},'updated');window.fire('suggestion')",
            ["child", "updated:click"],
          );
          await actions(
            "window.draw({mouseEvent:'onPointerDown',touchEvent:false});window.fire('outside');window.fire('outside','touchend');window.fire('outside','pointerdown')",
            ["close:pointerdown"],
          );
          await actions(
            "window.draw({mouseEvent:false,touchEvent:'onTouchStart'});window.fire('outside','touchstart');window.fire('outside','touchend');window.fire('outside')",
            ["close:touchstart"],
          );
          if (callbacks && !framed) {
            await evaluate(
              "window.draw();" +
                callbacks +
                ";window.appHandler=window.searchHandler;window.fire('suggestion');window.fire('outside');window.appHandler=window.panelHandler;window.fire('outside');window.appHandler=null;window.take()",
            );
            assert.deepEqual(await evaluate("window.calls"), ["search", false]);
          }
          const disposed = await evaluate(
            "window.end();window.fire('outside','touchstart');window.take()",
          );
          assert.ok(disposed.includes("cleanup"));
          assert.ok(!disposed.some((s) => s.startsWith("close:")));
        }
      }
    console.log(
      "Click-away passed outside, portal, touch, scrollbar, callback, iframe and cleanup checks on both controls.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
