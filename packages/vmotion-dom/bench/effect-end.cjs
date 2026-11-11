"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const {
  effect,
  drain,
} = require("../../../scripts/motion-dom-conformance/effect-end-fixture.cjs");
const cases = [1, 8].flatMap((count) =>
  [false, true].map((withEnd) => ({
    name: `complete and release ${count} custom values${withEnd ? " with transitionEnd" : ""}`,
    async: true,
    make(file) {
      require("../../../scripts/motion-dom-conformance/handoff-fixture.cjs").globals();
      const api = require(file),
        e = effect(api),
        subject = { custom: true, ...(withEnd ? { hidden: 0 } : {}) },
        frames = {};
      for (let i = 0; i < count; i++) {
        subject["v" + i] = 0;
        frames["v" + i] = [0, 20];
      }
      if (withEnd) frames.transitionEnd = { v0: 30, hidden: 1 };
      const options = { duration: 1, ease: "linear", autoplay: false };
      return async () => {
        const a = api.animateEffectSubject(e, subject, frames, options);
        a.forEach((x) => x.complete());
        await drain(api, e, subject);
        const result = [subject.v0, subject["v" + (count - 1)], subject.hidden];
        a.forEach((x) => x.stop());
        e.state(subject).release();
        return result;
      };
    },
    validate(value) {
      assert.deepEqual(value, [
        withEnd ? 30 : 20,
        count === 1 && withEnd ? 30 : 20,
        withEnd ? 1 : undefined,
      ]);
    },
  })),
);
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      ...fs.readdirSync(root).filter((x) => x.endsWith(".cjs")),
      "package.json",
      "PROVENANCE.json",
      "bench/effect-end.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-dom-conformance/effect-end-fixture.cjs",
      "../../scripts/motion-dom-conformance/custom-effect-fixture.cjs",
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
