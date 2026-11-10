"use strict";
const assert = require("node:assert/strict"),
  fixture = require("./target-fixture.cjs");
require("../motion-utils-conformance/check-controls.cjs").check();
require("./handoff-fixture.cjs").globals();
const current = require("../motion-utils-conformance/node_modules/motion-dom"),
  vpm = require("../../packages/vmotion-dom");
const timeout = setTimeout(() => {
  console.error("target conformance did not finish");
  process.exit(1);
}, 15000);
(async () => {
  let checks = 0;
  for (const end of [
    { display: "none" },
    { opacity: 0.4 },
    { display: "flex", x: 0 },
    { "--size": "10px" },
  ])
    for (const target of [{ opacity: [1, 0] }, { x: [0, 20] }, {}])
      for (const transition of [
        { duration: 0.2, autoplay: false },
        { duration: 0.1, repeat: 1, repeatType: "reverse", autoplay: false },
        { type: false },
      ]) {
        const request = { ...target, transition, transitionEnd: end };
        const a = await fixture.complete(
            current,
            fixture.owner(current),
            request,
          ),
          b = await fixture.complete(vpm, fixture.owner(vpm), request);
        assert.deepEqual(b, a);
        checks++;
      }
  console.log(
    `${checks} target completion/transitionEnd comparisons against motion-dom 14.7.0 pass.`,
  );
})()
  .finally(() => clearTimeout(timeout))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
