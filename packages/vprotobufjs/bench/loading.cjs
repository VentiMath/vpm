"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.resolve(
      root,
      "../../scripts/protobuf-conformance/node_modules/protobufjs",
    ),
    vpm: root,
    files: [
      "package.json",
      "runtime",
      "bench/loading.cjs",
      "../../scripts/protobuf-conformance/package-lock.json",
      "../../scripts/protobuf-conformance/node_modules/protobufjs",
    ],
    cases: [
      {
        name: "load and resolve bundled wrappers",
        make: (file) => {
          const pb = require(file);
          return () =>
            new pb.Root()
              .loadSync("../protos/google/protobuf/wrappers.proto")
              .resolveAll();
        },
        validate: (root) => {
          assert.deepEqual(root.files, ["google/protobuf/wrappers.proto"]);
          const T = root.lookupType("google.protobuf.StringValue");
          assert.equal(
            T.decode(T.encode({ value: "pipeline" }).finish()).value,
            "pipeline",
          );
        },
      },
      {
        name: "load duplicate bundled aliases",
        make: (file) => {
          const pb = require(file);
          return () =>
            new pb.Root()
              .loadSync([
                "../protos/google/protobuf/wrappers.proto",
                "google/protobuf/wrappers.proto",
                "https://schemas.invalid/google/protobuf/wrappers.proto",
              ])
              .resolveAll();
        },
        validate: (root) => {
          assert.deepEqual(root.files, ["google/protobuf/wrappers.proto"]);
          assert(root.lookupType("google.protobuf.StringValue"));
        },
      },
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
