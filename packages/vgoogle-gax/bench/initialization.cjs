"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.resolve(
      root,
      "../../scripts/gax-conformance/node_modules/google-gax",
    ),
    vpm: root,
    files: [
      "package.json",
      "build/src/iamService.js",
      "build/src/fallback.js",
      "bench/initialization.cjs",
      "../vprotobufjs/runtime",
      "../../scripts/gax-conformance/package-lock.json",
      "../../scripts/gax-conformance/node_modules/google-gax",
    ],
    cases: [
      {
        name: "IAM construction / explicit endpoint",
        make: (file) => {
          const { IamClient } = require(
              path.join(file, "build/src/iamService.js"),
            ),
            { GrpcClient } = require(path.join(file, "build/src/grpc.js"));
          const transport = new GrpcClient({ auth: {} });
          return () =>
            new IamClient(transport, {
              servicePath: "fixture.invalid",
              port: 443,
              projectId: "fixture",
            });
        },
        validate: (x) => {
          assert.equal(typeof x.getIamPolicy, "function");
          assert.equal(x._opts.servicePath, "fixture.invalid");
          assert.equal(x._opts.port, 443);
        },
      },
      {
        name: "REST loadProto / empty schema",
        make: (file) => {
          const { GrpcClient } = require(
              path.join(file, "build/src/fallback.js"),
            ),
            client = new GrpcClient({ auth: {} });
          return () => client.loadProto({});
        },
        validate: (x) => {
          assert.equal(x.nested, undefined);
          assert.deepEqual(x.toJSON(), {});
        },
      },
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
