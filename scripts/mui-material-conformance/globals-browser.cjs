"use strict";
const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "globals",
  async ({ send, wait, evaluate, baseUrl }) => {
    for (const version of ["app", "current"]) {
      let control;
      for (const lib of ["upstream", "vpm"]) {
        await send("Page.navigate", { url: baseUrl + version + "-" + lib });
        await wait("typeof window.draw === 'function'");
        assert.equal(
          await evaluate('CSS.supports("-webkit-print-color-scheme", "light")'),
          false,
        );
        const states = [];
        for (const mode of ["light", "dark", "clear"]) {
          states.push(
            await evaluate(
              "window.draw(" + JSON.stringify(mode) + ");window.snapshot()",
            ),
          );
        }
        assert.deepEqual(states[0], [
          "32px",
          "rgb(12, 34, 56)",
          "19px",
          "",
          true,
        ]);
        assert.deepEqual(states[1], [
          "32px",
          "rgb(98, 76, 54)",
          "19px",
          "",
          true,
        ]);
        assert.equal(states[2][4], false);
        if (control) assert.deepEqual(states, control);
        control = states;
      }
    }
    console.log(
      "GlobalStyles theme changes, iframe cache isolation and unmount match in Chrome.",
    );
  },
).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
