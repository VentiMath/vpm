"use strict";
const assert = require("node:assert/strict");
(async () => {
  const control = await require("./node_modules/.vpm-store/upstream.cjs").run();
  const candidate = await require("./node_modules/.vpm-store/vpm.cjs").run();
  assert.deepEqual(candidate, control);
  console.log(
    "Unchanged Table9: " +
      candidate.snapshots.length +
      " sorting/filter/pagination/selection/options/external ownership snapshots and every state notification match.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
