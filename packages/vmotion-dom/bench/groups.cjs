"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const helpers = require("../../../scripts/motion-dom-conformance/handoff-fixture.cjs"),
  targets = require("../../../scripts/motion-dom-conformance/target-fixture.cjs");
const previous = process.env.VMOTION_GROUPS_PREVIOUS === "1";
const baseline = previous
  ? require("../../../scripts/motion-dom-conformance/setup-baseline.cjs").prepare(
      "3365200d5149723e870fb93bf217f8be82346226",
    )
  : undefined;
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream:
      baseline ||
      path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: [
      ...[1, 8].map((count) => ({
        name: `group, seek, read and stop ${count} prepared playback controls`,
        make(file) {
          const api = require(file);
          const children = Array.from({ length: count }, (_, i) => ({
            time: 0,
            speed: 1,
            state: "paused",
            startTime: 1000,
            duration: i + 1,
            iterationDuration: i + 1,
            finished: Promise.resolve(),
            play() {},
            pause() {},
            stop() {},
            cancel() {},
            complete() {},
          }));
          return () => {
            const group = new api.GroupAnimation(children);
            group.time = 0.5;
            group.speed = 2;
            const value = group.duration + group.time + group.speed;
            group.stop();
            return value;
          };
        },
        validate: (x) => assert.equal(x, count + 2.5),
      })),
      {
        name: "create and complete a renderer target with transitionEnd",
        async: true,
        make(file) {
          helpers.globals();
          const api = require(file);
          return async () => {
            const owner = targets.owner(api),
              result = await targets.complete(api, owner, {
                opacity: [1, 0],
                x: [0, 20],
                transition: { duration: 0.2, autoplay: false },
                transitionEnd: { display: "none" },
              });
            return result;
          };
        },
        validate: (x) =>
          assert.deepEqual(x, { opacity: 0, x: 20, display: "none" }),
      },
    ],
    files: [
      ...(previous
        ? [
            "../../scripts/motion-dom-conformance/setup-baseline.cjs",
            "../../scripts/motion-dom-conformance/node_modules/.setup-before-3365200d",
          ]
        : []),
      "index.cjs",
      "index.mjs",
      "group.cjs",
      "target.cjs",
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
      "color.cjs",
      "mix.cjs",
      "neutral.cjs",
      "spring.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/groups.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-dom-conformance/handoff-fixture.cjs",
      "../../scripts/motion-dom-conformance/target-fixture.cjs",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
