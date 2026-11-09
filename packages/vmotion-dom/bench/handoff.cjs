"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const helper = require("../../../scripts/motion-dom-conformance/handoff-fixture.cjs");
const previous = process.env.VMOTION_HANDOFF_PREVIOUS === "1";
const baseline = previous
  ? require("../../../scripts/motion-dom-conformance/setup-baseline.cjs").prepare(
      "112782a62e5d4a63e395dfb1af6b999c8b9f2b50",
    )
  : undefined;
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream:
      baseline ||
      path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: [1, 8].map((count) => ({
      name: `bind, transfer and release ${count} renderer values`,
      make(file) {
        helper.globals();
        const api = require(file),
          element = helper.node(),
          owner = helper.renderer(element),
          values = {};
        for (let i = 0; i < count; i++)
          values["--value" + i] = api.motionValue(i + 1);
        return () => {
          api.styleEffect([element], values);
          api.handOffElementState(element, owner);
          let sum = 0;
          for (let i = 0; i < count; i++)
            sum += owner.getValue("--value" + i).get();
          owner.destroy();
          api.frameSteps.read.process({
            timestamp: 1000,
            delta: 16,
            isProcessing: true,
          });
          return sum;
        };
      },
      validate: (x) => assert.equal(x, (count * (count + 1)) / 2),
    })),
    files: [
      ...(previous
        ? [
            "../../scripts/motion-dom-conformance/setup-baseline.cjs",
            "../../scripts/motion-dom-conformance/node_modules/.setup-before-112782a6",
          ]
        : []),
      "index.cjs",
      "index.mjs",
      "element.cjs",
      "effects.cjs",
      "transition.cjs",
      "single.cjs",
      "reads.cjs",
      "resolver.cjs",
      "value.cjs",
      "frame.cjs",
      "playback.cjs",
      "mapping.cjs",
      "spring.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/handoff.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-dom-conformance/handoff-fixture.cjs",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
