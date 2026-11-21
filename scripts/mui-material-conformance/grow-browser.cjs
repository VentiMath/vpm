"use strict";
const assert = require("node:assert/strict");
const app = process.env.VPM_APP_CHECKOUT;
require("./compare-scenes.cjs")(
  "grow",
  async ({ send, evaluate, wait, baseUrl }) => {
    for (const version of ["app", "current"]) {
      let reference;
      for (const lib of ["upstream", "vpm"]) {
        const variant = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + variant + "-hydrate" });
        await wait(
          "location.pathname==='/" + variant + "-hydrate' && window.draw",
        );
        await wait(
          "window.hydrated && window.host.querySelector('section')?.style.visibility==='hidden'",
        );
        await evaluate(
          "window.events.length=0;window.draw(false);window.nodeBefore=window.lastRef; window.draw(true)",
        );
        const full = async (phase) =>
          wait("window.events.some(e=>e.phase==='" + phase + "')");
        await full("Entered");
        assert.equal(
          await evaluate(
            "window.nodeBefore===window.lastRef && window.lastRef.style.transform==='none'",
          ),
          true,
        );
        await evaluate("window.draw(false)");
        await full("Exited");
        assert.equal(
          await evaluate("window.lastRef.style.visibility"),
          "hidden",
        );
        const events = await evaluate("window.events");
        assert.deepEqual(
          events.map((e) => e.phase),
          ["Enter", "Entering", "Entered", "Exit", "Exiting", "Exited"],
        );
        // Material 9 clears the transition declaration once hidden. Version 7 keeps it.
        const active = events.filter((e) => e.phase !== "Exited");
        if (reference) assert.deepEqual(active, reference);
        else reference = active;
        await evaluate(
          "window.events.length=0;window.draw(true,{timeout:{enter:240,exit:30}});window.draw(false,{timeout:{enter:240,exit:30}})",
        );
        await full("Exited");
        assert.ok(
          !(await evaluate("window.events")).some((e) => e.phase === "Entered"),
        );
        await evaluate(
          "window.events.length=0;window.draw(true,{timeout:60,unmountOnExit:true});window.draw(false,{timeout:10,unmountOnExit:true})",
        );
        await wait("!window.lastRef && !window.host.querySelector('section')");
        if (version === "current") {
          await evaluate(
            "window.draw(false,{}, {motion:{reducedMotion:'always'}});window.events.length=0;window.draw(true,{timeout:500}, {motion:{reducedMotion:'always'}})",
          );
          await full("Entered");
          assert.equal(
            await evaluate(
              "parseFloat(window.events.find(e=>e.phase==='Entering').durations)",
            ),
            0,
            variant + " reduced motion",
          );
        }
        // Reopening during the exit should cancel the old unmount timer.
        await evaluate(
          "window.finish();window.draw(true,{appear:false});window.events.length=0;window.draw(false,{timeout:90,unmountOnExit:true});window.draw(true,{timeout:20,unmountOnExit:true})",
        );
        await full("Entered");
        await evaluate("new Promise(r=>setTimeout(r,110))");
        assert.deepEqual(await evaluate("window.events.map(e=>e.phase)"), [
          "Exit",
          "Exiting",
          "Enter",
          "Entering",
          "Entered",
        ]);
        assert.equal(
          await evaluate("window.lastRef===window.host.firstElementChild"),
          true,
        );
        if (version === "current") {
          await send("Emulation.setEmulatedMedia", {
            features: [{ name: "prefers-reduced-motion", value: "reduce" }],
          });
          await evaluate(
            "window.finish();window.draw(false,{timeout:0},{motion:{reducedMotion:'system'}})",
          );
          assert.equal(await evaluate("window.lastRef.style.visibility"), "hidden");
          await evaluate(
            "window.events.length=0;window.draw(true,{timeout:60},{motion:{reducedMotion:'system'}})",
          );
          await full("Entered");
          assert.equal(
            await evaluate(
              "parseFloat(window.events.find(e=>e.phase==='Entering').durations)",
            ),
            0,
          );
          await evaluate(
            "window.events.length=0;window.draw(false,{disablePrefersReducedMotion:true,timeout:60},{motion:{reducedMotion:'system'}})",
          );
          await full("Exited");
          assert.ok(
            await evaluate(
              "parseFloat(window.events.find(e=>e.phase==='Exiting').durations)>0",
            ),
          );
          await send("Emulation.setEmulatedMedia", { features: [] });
        }
        if (app)
          for (const [kind, depth] of [
            ["Group", "2"],
            ["Collapse", "3"],
          ]) {
            await evaluate(
              require("./app-grow.cjs")(app, process.env.VPM_APP_REF, kind),
            );
            await evaluate(
              "window.drawApp(false,true);window.drawApp(true,true)",
            );
            await wait(
              "window.host.querySelector('#menu-fuse-list-grow').style.transform==='none'",
            );
            assert.equal(
              await evaluate("window.host.querySelector('li').dataset.depth"),
              depth,
            );
            await evaluate(
              "window.panel=window.host.firstElementChild;window.panel.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));window.panel.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));",
            );
            assert.deepEqual(await evaluate("window.toggles"), [true, false]);
            await evaluate("window.drawApp(false,true)");
            await wait("window.panel.style.visibility==='hidden'");
            assert.equal(
              await evaluate(
                "window.host.firstElementChild===window.panel && window.panel.style.transformOrigin.startsWith('0')",
              ),
              true,
            );
          }
      }
    }
    console.log(
      "Grow hydration, auto height, callbacks, retained nodes, interruption, unmount and reduced motion match both Material controls.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
