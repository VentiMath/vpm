"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "step-content",
  async ({ send, evaluate, wait, baseUrl }) => {
    for (const version of ["app", "current"]) {
      let control;
      for (const lib of ["upstream", "vpm"]) {
        const page = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + page });
        await wait("location.pathname==='/" + page + "' && window.draw");
        if (process.env.VPM_APP_CHECKOUT)
          await evaluate(
            require("./app-course-sidebar.cjs")(
              process.env.VPM_APP_CHECKOUT,
              process.env.VPM_APP_REF,
            ),
          );
        await evaluate(
          "window.draw({original:true});window.contents=()=>[...document.querySelectorAll('.MuiStepContent-root')];window.item=contents()[2];window.inner=item.querySelector('.MuiCollapse-wrapperInner');window.button=document.querySelector('button');button.focus();true",
        );
        const state = await evaluate(
          "contents().map(e=>{const css=getComputedStyle(e),b=e.getBoundingClientRect();return [e.textContent,css.marginLeft,css.paddingLeft,css.paddingRight,css.borderLeftWidth,css.borderLeftColor,css.cursor,Math.round(b.x),Math.round(b.width),Math.round(b.height),css.color]})",
        );
        assert.equal(state.length, 6);
        assert.equal(state[5][4], "0px");
        assert.equal(state[0][4], "1px");
        assert.equal(state[0][1], "8px");
        assert.equal(state[0][6], "pointer");
        if (lib === "upstream") control = state;
        else assert.deepEqual(state, control, page);
        const [x, y] = await evaluate(
          "(()=>{const b=inner.getBoundingClientRect();return [b.x+4,b.y+b.height/2]})()",
        );
        for (const [type, buttons] of [
          ["mousePressed", 1],
          ["mouseReleased", 0],
        ])
          await send("Input.dispatchMouseEvent", {
            type,
            button: "left",
            buttons,
            x,
            y,
            clickCount: 1,
          });
        await wait("window.selected.at(-1)===3");
        assert.ok(
          await evaluate(
            "item===contents()[2]&&item.contains(inner)&&contents().every(e=>e.textContent)",
          ),
        );
        if (lib === "vpm")
          assert.equal(
            await evaluate("item.closest('li').getAttribute('aria-current')"),
            "step",
          );
        await evaluate("window.reverseSteps();true");
        assert.ok(await evaluate("item===contents()[3]&&item.contains(inner)"));
        await evaluate(
          "window.draw({expanded:false,activeStep:2,content:{transitionDuration:60}});true",
        );
        await wait(
          "contents().filter(e=>e.textContent).length===1 && !!contents()[1].textContent",
        );
        await evaluate(
          "window.draw({expanded:false,activeStep:3,content:{transitionDuration:60}});window.draw({expanded:false,activeStep:2,content:{transitionDuration:60}});true",
        );
        await wait(
          "contents()[1].querySelector('.MuiCollapse-entered')&&contents().filter(e=>e.textContent).length===1",
        );
      }
    }
    console.log(
      "Academy subtitles, selection, node retention, theme geometry, collapse reversal and final unmount pass in Chrome.",
    );
  },
).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
