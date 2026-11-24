"use strict";
// npm MUI X pickers draw their calendar inside a Material Popper with a
// transition child. The unchanged picker must behave the same on VPM Material
// as on the npm Material it was installed against.
const assert = require("node:assert/strict");
const escape =
  "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))";
const frames =
  "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))";
require("./compare-scenes.cjs")(
  "pickers",
  async ({ send, evaluate, wait, baseUrl }) => {
    const seen = {};
    for (const lib of ["upstream", "vpm"]) {
      const variant = "app-" + lib,
        out = (seen[lib] = []);
      await send("Page.navigate", { url: baseUrl + variant });
      await wait("location.pathname === '/" + variant + "' && window.draw");
      for (const kind of ["date", "datetime"])
        for (const reduceAnimations of [false, true]) {
          const label = kind + (reduceAnimations ? " fade" : " grow");
          await evaluate(
            "window.draw('" + kind + "',{reduceAnimations:" + reduceAnimations + "})",
          );
          await wait("window.opener()");
          assert.equal(await evaluate("window.popup()"), null, label);

          // Opening shows the month below the field, with the value selected.
          await evaluate("window.opener().click()");
          await wait("window.report()?.shown && window.report().side");
          const open = await evaluate("window.report()");
          assert.ok(open.days >= 28, variant + " " + label + ": no calendar days");
          assert.deepEqual(open.selected, ["12"], variant + " " + label);
          out.push([label, "open", open]);

          // Escape plays the exit before the popup leaves the document.
          const leaving = await evaluate(
            escape + ";!!window.popup()&&getComputedStyle(window.popup()).display",
          );
          await wait("window.popup()===null");
          await evaluate(frames);
          out.push([label, "escape", leaving, await evaluate("window.changes")]);

          // A second opening starts from the same closed state.
          await evaluate("window.opener().click()");
          await wait("window.report()?.shown && window.report().side");
          await evaluate(
            "window.days().find(day=>day.textContent==='20').click()",
          );
          await wait("window.changes.includes(20)");
          if (kind === "date") await wait("window.popup()===null");
          else {
            await wait("window.report()?.shown");
            await evaluate(escape);
            await wait("window.popup()===null");
          }
          await evaluate(frames);
          out.push([label, "choose", await evaluate("window.changes")]);
        }

      // With no room below, the popup opens above its field.
      await evaluate(
        "document.querySelector('main').style.top=(innerHeight-70)+'px';window.draw('date')",
      );
      await wait("window.opener()");
      await evaluate("window.opener().click()");
      await wait(
        "window.report()?.shown && window.report().side?.startsWith('top')",
      );
      out.push(["date grow", "above", await evaluate("window.report()")]);
      await evaluate(escape);
      await wait("window.popup()===null");
    }
    assert.deepEqual(seen.vpm, seen.upstream);
    console.log(
      "npm DatePicker and DateTimePicker open, flip, choose a day and finish their Grow and Fade exits identically on npm and VPM Material (" +
        seen.vpm.length +
        " observations).",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
