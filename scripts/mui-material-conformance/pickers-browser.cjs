"use strict";
// npm MUI X pickers draw their calendar inside a Material Popper with a
// transition child where the browser reports a mouse, and inside a Material
// Dialog where it does not. The unchanged picker must behave the same in both
// layouts on VPM Material as on the npm Material it was installed against.
const assert = require("node:assert/strict");
const escape =
  "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))";
const frames =
  "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))";
require("./compare-scenes.cjs")(
  "pickers",
  async ({ send, evaluate, wait, baseUrl }) => {
    const seen = {};
    // A real click and key press: focus moves to what was clicked, and a key
    // goes to whatever holds focus, as they do for a person.
    const click = async (target) => {
      const [x, y] = await evaluate(
        "(el=>{el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})(" +
          target +
          ")",
      );
      for (const type of ["mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", {
          type,
          x,
          y,
          button: "left",
          clickCount: 1,
        });
    };
    const press = async (key, code) => {
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key,
        code: key,
        windowsVirtualKeyCode: code,
      });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key });
    };
    const focusInField =
      "document.querySelector('main').contains(document.activeElement)";
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
      await evaluate("document.querySelector('main').style.top='80px'");

      // The dialog layout keeps a chosen day on screen until its last action
      // accepts it, then hands focus back to the field.
      for (const kind of ["date", "datetime"]) {
        const label = kind + " dialog";
        await evaluate("window.draw('" + kind + "',{layout:'dialog'})");
        await wait("window.opener()");
        await click("window.opener()");
        await wait("window.sheetReport()?.shown");
        const open = await evaluate("window.sheetReport()");
        assert.equal(await evaluate("window.popup()"), null, label);
        assert.ok(open.days >= 28, variant + " " + label + ": no calendar days");
        assert.deepEqual(open.selected, ["12"], variant + " " + label);
        out.push([label, "open", open]);

        await click("window.days().find(day=>day.textContent==='20')");
        await wait("window.changes.includes(20)");
        await evaluate(frames);
        out.push([label, "choose", await evaluate("window.sheetReport()")]);

        // A date and time picker steps to its clock before it can be accepted.
        if (kind === "datetime") {
          await click("window.actions().at(-1)");
          await wait("window.days().length===0");
          await evaluate(frames);
          out.push([label, "clock", await evaluate("window.sheetReport()")]);
        }
        await click("window.actions().at(-1)");
        await wait("window.sheet()===null");
        await evaluate(frames);
        out.push([
          label,
          "accept",
          await evaluate("window.changes"),
          await evaluate(focusInField),
        ]);

        // Escape closes a reopened dialog and keeps the accepted day.
        await click("window.opener()");
        await wait("window.sheetReport()?.shown");
        await press("Escape", 27);
        await wait("window.sheet()===null");
        await evaluate(frames);
        out.push([
          label,
          "escape",
          await evaluate("window.changes"),
          await evaluate(focusInField),
        ]);
      }
      // Programmatic view changes can remove the currently focused day without
      // a focusin event. Keep keyboard focus in the dialog after that removal.
      await evaluate("window.draw('datetime',{layout:'dialog'})");
      await click("window.opener()");await wait("window.sheetReport()?.shown");
      await evaluate("window.days().find(day=>day.getAttribute('aria-selected')==='true').focus();window.actions().at(-1).click()");
      await wait("window.days().length===0 && window.sheet().contains(document.activeElement)");
      out.push(['datetime dialog','removed day',await evaluate('window.sheet().contains(document.activeElement)')]);
      await press('Escape',27);await wait("window.sheet()===null");
    }
    assert.deepEqual(seen.vpm, seen.upstream);
    console.log(
      "npm DatePicker and DateTimePicker behave identically on npm and VPM Material in their popup layout (open, flip, choose a day, Grow and Fade exits) and their dialog layout (open, choose, accept, Escape): " +
        seen.vpm.length +
        " observations.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
