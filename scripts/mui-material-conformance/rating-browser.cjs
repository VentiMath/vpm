"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "rating",
  async ({ send, wait, evaluate, settle, baseUrl }) => {
    const controls = new Map();
    const input =
      'document.querySelectorAll(".MuiRating-root")[1].querySelectorAll("input")';
    const state = () =>
      evaluate(`[...document.querySelectorAll(".MuiRating-root")].map(root=>({
   picked:[...root.querySelectorAll("input:checked")].map(i=>i.value),stars:root.querySelectorAll(".MuiRating-iconFilled").length,
   size:getComputedStyle(root).fontSize,width:root.getBoundingClientRect().width,
   labels:[...root.querySelectorAll("input")].map(i=>i.labels[0]?.textContent)
 }))`);
    for (const version of ["app", "current"])
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant });
        await wait("window.draw");
        await evaluate("draw({rows:2})");
        const snapshots = [await state()];
        assert.deepEqual(
          snapshots[0].map((s) => s.picked),
          [[], []],
        );
        assert.equal(snapshots[0][0].size, "18px");
        assert.equal(
          await evaluate(
            'new Set([...document.querySelectorAll("input")].map(i=>i.id)).size',
          ),
          12,
        );
        assert.equal(
          await evaluate(
            'new Set([...document.querySelectorAll("input")].map(i=>i.name)).size',
          ),
          2,
        );
        const point = await evaluate(
          `(()=>{const r=document.querySelectorAll(".MuiRating-root")[0].querySelectorAll("label")[2].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
        );
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          ...point,
        });
        await evaluate(settle);
        snapshots.push(await state());
        assert.equal(snapshots.at(-1)[0].stars, 3);
        for (let i = 0; i < 2; i++) {
          for (const type of ["mousePressed", "mouseReleased"])
            await send("Input.dispatchMouseEvent", {
              type,
              ...point,
              button: "left",
              clickCount: 1,
            });
          await evaluate(settle);
          snapshots.push(await state());
        }
        assert.deepEqual(await evaluate("window.picks"), [
          [0, 3],
          [0, null],
        ]);
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 400,
          y: 120,
        });
        await evaluate(settle);
        await evaluate(input + "[1].focus()");
        for (const type of ["keyDown", "keyUp"])
          await send("Input.dispatchKeyEvent", {
            type,
            key: "ArrowRight",
            code: "ArrowRight",
            windowsVirtualKeyCode: 39,
          });
        await evaluate(settle);
        snapshots.push(await state());
        assert.deepEqual(await evaluate("window.picks.at(-1)"), [1, 3]);
        await evaluate(input + "[5].click()");
        await evaluate(settle);
        assert.deepEqual(await evaluate("window.picks.at(-1)"), [1, null]);
        if (lib === "upstream") controls.set(version, snapshots);
        else assert.deepEqual(snapshots, controls.get(version), variant);
        await send("Page.navigate", { url: baseUrl + variant + "-hydrate" });
        await wait("window.hydrated");
        await evaluate(settle);
        assert.ok(
          await evaluate(
            'window.originalInput===document.querySelector("input")',
          ),
          variant,
        );
      }
    console.log(
      "Chrome matched two independent WARML ratings for hover, select, clear, arrow keys, labels, dimensions and hydration.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
