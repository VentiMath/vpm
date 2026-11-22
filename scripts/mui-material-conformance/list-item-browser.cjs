"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "list-item",
  async ({ send, evaluate, wait, baseUrl }) => {
    for (const version of ["app", "current"]) {
      let baseline;
      for (const lib of ["upstream", "vpm"]) {
        const page = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + page });
        await wait("location.pathname==='/" + page + "' && window.draw");
        await evaluate(
          "draw();window.eventRow=document.querySelector('[data-title]');window.toggle=document.querySelector('input');toggle.focus();toggle.click();true",
        );
        const snap = await evaluate(
          `[...document.querySelectorAll('li')].map(el=>{const s=getComputedStyle(el),a=el.querySelector('input')?.parentElement;return [el.textContent,s.display,s.paddingTop,s.paddingLeft,s.paddingRight,s.alignItems,a&&getComputedStyle(a).right,a&&getComputedStyle(a).position]})`,
        );
        assert.equal(snap.length, 7);
        assert.equal(snap[0][2], "8px");
        assert.equal(snap[4][4], "48px");
        if (baseline) assert.deepEqual(snap, baseline);
        else baseline = snap;
        assert.ok(
          await evaluate(
            "draw({reverse:true,dense:true,detail:'Tuesday'});eventRow===document.querySelectorAll('[data-title]')[1] && eventRow.textContent.endsWith('Tuesday') && toggle===document.activeElement && toggle.checked && getComputedStyle(eventRow).paddingTop==='4px'",
          ),
        );
      }
    }
    console.log(
      "Chrome verified toolbar rows, action positioning, checkbox focus and keyed updates.",
    );
  },
).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
