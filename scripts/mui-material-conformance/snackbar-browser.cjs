"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "snackbar",
  async ({ send, wait, evaluate, settle, baseUrl }) => {
    for (const name of [
      "app-upstream",
      "app-vpm",
      "current-upstream",
      "current-vpm",
    ]) {
      await send("Page.navigate", { url: baseUrl + name });
      await wait("window.draw");
      const alert = 'document.querySelector("[role=alert]")';
      const flush = (expression) => evaluate(expression + ";" + settle);
      const tick = async (ms) => {
        const clock = await evaluate("clock()");
        assert.equal(clock.length, 1, name);
        assert.equal(clock[0][1], ms, name);
        return clock[0][0];
      };
      await flush('document.querySelector("#copy").click()');
      assert.equal(
        await evaluate(alert + ".textContent"),
        "Link copied to clipboardUndo",
      );
      const position = await evaluate(
        '(()=>{const cs=getComputedStyle(document.querySelector(".MuiSnackbar-root"));return [cs.position,cs.bottom,cs.left,matchMedia("(min-width:600px)").matches]})()',
      );
      assert.deepEqual(position.slice(0, 3), [
        "fixed",
        position[3] ? "24px" : "8px",
        position[3] ? "24px" : "8px",
      ]);
      assert.equal(
        await evaluate("getComputedStyle(" + alert + ").backgroundColor"),
        "rgb(50, 50, 50)",
      );
      const first = await tick(2000);
      await flush("draw()");
      assert.equal(await tick(2000), first, name + " parent rerender");
      await flush(alert + '.querySelector("button").focus()');
      assert.deepEqual(await evaluate("clock()"), []);
      await flush('document.querySelector("#copy").focus()');
      await flush("fire(" + (await tick(1000)) + ")");
      await wait("!" + alert);
      assert.deepEqual(await evaluate("reasons"), ["timeout"]);
      await flush("draw({resumeHideDuration:700})");
      await flush('window.dispatchEvent(new Event("blur"))');
      assert.deepEqual(await evaluate("clock()"), []);
      await flush('window.dispatchEvent(new Event("focus"))');
      await tick(700);
      await flush(alert + ".click()");
      assert.deepEqual(await evaluate("reasons"), ["timeout"]);
      await flush("document.body.click()");
      await wait("!" + alert);
      await flush("draw()");
      await flush(
        'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))',
      );
      await wait("!" + alert);
      assert.deepEqual(await evaluate("reasons"), [
        "timeout",
        "clickaway",
        "escapeKeyDown",
      ]);
      await flush("draw()");
      await flush(
        "draw({open:false, transitionDuration:120});draw({open:true,transitionDuration:120})",
      );
      await evaluate("new Promise(r=>setTimeout(r,150))");
      assert.equal(
        await evaluate("Boolean(" + alert + ")"),
        true,
        name + " reopen during exit",
      );
      await tick(2000);
      await flush("unmountNotice()");
      assert.deepEqual(await evaluate("clock()"), []);
      await send("Page.navigate", { url: baseUrl + name + "-hydrate" });
      await wait("window.hydrationReady");
      await evaluate(settle);
      assert.equal(
        await evaluate("window.beforeHydration === " + alert),
        true,
        name + " hydrated alert",
      );
    }
    console.log(
      "Snackbar clipboard, timeout, focus, window pause, click-away, escape and hydration match both controls.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
