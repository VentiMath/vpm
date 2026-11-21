"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "grid",
  async ({ send, wait, evaluate, settle, baseUrl }) => {
    const controls = new Map();
    const resize = (width) =>
      send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 850,
        deviceScaleFactor: 1,
        mobile: false,
      });
    const layout = `(()=>{
    const root=document.querySelector('[data-archive]'), group=root.querySelector('[data-inner]')||root;
    const items=[...group.children].filter(e=>e.tagName!=='STYLE'), boxes=items.map(e=>e.getBoundingClientRect());
    return {width:boxes[0].width,inner:group.getBoundingClientRect().width, positions:boxes.map(b=>[b.left,b.top]),
      containerStyle:getComputedStyle(group).getPropertyValue("--imo-grid-container").trim(), gap:parseFloat(getComputedStyle(group).columnGap), color:getComputedStyle(items[0]).color};
  })()`;
    for (const version of ["app", "current"])
      for (const library of ["upstream", "vpm"]) {
        const name = version + "-" + library;
        await send("Page.navigate", { url: baseUrl + name });
        await wait("window.draw");
        for (const loading of [true, false]) {
          await evaluate(
            "draw(" + JSON.stringify({ loading, styled: true }) + ")",
          );
          if (!loading)
            await evaluate(
              'window.saved=document.querySelector("button");saved.focus();void 0',
            );
          for (const [width, columns] of [
            [400, 1],
            [799, 2],
            [1060, 3],
            [400, 1],
          ]) {
            await resize(width);
            await evaluate(settle);
            const state = await evaluate(layout),
              key = [version, loading, width].join("/");
            assert.equal(state.gap, 16, key);
            assert.equal(state.containerStyle, "yes", key);
            assert.equal(state.color, "rgb(12, 34, 56)", key);
            assert.ok(
              Math.abs(
                state.width -
                  (state.inner - (columns - 1) * state.gap) / columns,
              ) < 0.05,
              key,
            );
            assert.equal(
              state.positions.filter(([, top]) => top === state.positions[0][1])
                .length,
              columns,
              key,
            );
            if (library === "upstream") controls.set(key, state);
            else assert.deepEqual(state, controls.get(key), key);
            if (!loading)
              assert.ok(await evaluate("document.activeElement===saved"), key);
          }
        }
        await evaluate('document.querySelectorAll("button")[1].click()');
        assert.equal(await evaluate("window.selected"), 2025);
        await evaluate("draw({columns:{md:8},spacing:{sm:1,md:2},count:2})");
        for (const [width, gap] of [
          [700, 8],
          [950, 16],
        ]) {
          await resize(width);
          await evaluate(settle);
          assert.equal((await evaluate(layout)).gap, gap, name);
        }
        await resize(950);
        for (const nested of ["direct", "wrapped"]) {
          await evaluate(
            "draw(" +
              JSON.stringify({
                nested,
                columns: 8,
                spacing: 3,
                size: 4,
                count: 2,
              }) +
              ")",
          );
          await evaluate(settle);
          const state = await evaluate(layout),
            key = version + "-" + nested;
          assert.equal(state.gap, nested === "direct" ? 24 : 0, key);
          if (library === "upstream") controls.set(key, state);
          else assert.deepEqual(state, controls.get(key), key);
        }
        await send("Page.navigate", { url: baseUrl + name + "-hydrate" });
        await wait("window.hydrationReady");
        await evaluate(settle);
        assert.ok(
          await evaluate(
            'window.serverButton===document.querySelector("button")',
          ),
          name,
        );
      }
    console.log(
      "Year cards and placeholders match at three widths; focus, click, nested spacing and hydration pass.",
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
