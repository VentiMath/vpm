"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const filter = "blur(10px) brightness(.5) contrast(20%)",
  shadow = "10px 20px 30px #f00";
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: [
      {
        name: "build neutral filter identity",
        make(file) {
          const api = require(file);
          return () => api.getAnimatableNone("filter", filter);
        },
        validate: (x) =>
          assert.equal(x, "blur(0px) brightness(1) contrast(100%)"),
      },
      {
        name: "build neutral shadow identity",
        make(file) {
          const api = require(file);
          return () => api.getAnimatableNone("boxShadow", shadow);
        },
        validate: (x) => assert.equal(x, "0px 0px 0px rgba(255, 0, 0, 0)"),
      },
      {
        name: "construct and normalize three filter keyframes",
        make(file) {
          const api = require(file);
          class Probe extends api.DOMKeyframesResolver {
            result() {
              this.resolveNoneKeyframes();
              return this.unresolvedKeyframes.join(";");
            }
          }
          return () =>
            new Probe(["none", filter, "none"], () => {}, "filter").result();
        },
        validate: (x) =>
          assert.equal(
            x,
            `blur(0px) brightness(1) contrast(100%);${filter};blur(0px) brightness(1) contrast(100%)`,
          ),
      },
    ],
    files: [
      ...require("node:fs")
        .readdirSync(root)
        .filter((x) => x.endsWith(".cjs")),
      "package.json",
      "PROVENANCE.json",
      "bench/neutral.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
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
