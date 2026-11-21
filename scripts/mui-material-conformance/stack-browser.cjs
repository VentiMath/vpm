"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "stack",
  async ({ send, wait, evaluate, baseUrl, settle }) => {
    const snapshot = `(() => {
    const box=document.querySelector('#contest'), css=getComputedStyle(box), child=getComputedStyle(box.querySelectorAll('a')[1]);
    return {direction:css.flexDirection, wrap:css.flexWrap,align:css.alignItems,
      gap:css.gap,top:child.marginTop,left:child.marginLeft,right:child.marginRight,
      tag:box.localName,border:css.borderTopWidth};
  })()`;
    const resize = (width) =>
      send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 700,
        deviceScaleFactor: 1,
        mobile: false,
      });
    const controls = new Map();
    for (const version of ["app", "current"])
      for (const lib of ["upstream", "vpm"]) {
        const name = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + name });
        await wait("window.draw");
        for (const kind of ["arml", "warml", "mic", "editor"]) {
          await evaluate(
            "draw(" +
              JSON.stringify({
                kind,
                modern: name === "current-upstream",
                styled: true,
              }) +
              ")",
          );
          await evaluate(
            'document.querySelector("a").focus();window.focused=document.activeElement;void 0;',
          );
          for (const width of [400, 800, 400]) {
            await resize(width);
            await evaluate(settle);
            const state = await evaluate(snapshot),
              key = [version, kind, width].join("/");
            if (lib === "upstream") controls.set(key, state);
            else assert.deepEqual(state, controls.get(key), key);
            assert.equal(
              state.direction,
              kind === "arml" || kind === "editor" || width >= 600
                ? "row"
                : "column",
              key,
            );
            assert.equal(state.tag, "section", key);
            assert.equal(state.border, "3px", key);
            if (kind === "warml") assert.equal(state.gap, "12px", key);
            if (kind === "mic")
              assert.equal(
                state.direction === "row" ? state.left : state.top,
                "16px",
                key,
              );
            assert.equal(
              await evaluate("document.activeElement===window.focused"),
              true,
              key,
            );
          }
        }
        // An unspaced Stack must leave an individual link's margins intact.
        await evaluate(
          'draw({spacing:0,kind:"mic"});document.querySelector("a").className="custom-margin";const s=document.createElement("style");s.textContent=".custom-margin{margin:11px}";document.head.append(s)',
        );
        assert.equal(
          await evaluate(
            'getComputedStyle(document.querySelector("a")).marginTop',
          ),
          "11px",
        );
        await send("Page.navigate", { url: baseUrl + name + "-hydrate" });
        await wait("window.hydrationReady");
        await evaluate(settle);
        assert.equal(
          await evaluate('window.serverLink===document.querySelector("a")'),
          true,
          name,
        );
      }
    console.log(
      "Contest layouts, margins, gap, alignment, wrapping, theme defaults, focus and hydration pass in Chrome.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
