"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/jwt-decode-conformance");
const header = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" }),
).toString("base64url");
const payloads = [
  [
    "mock user payload",
    { id: "user-123", iat: 1794500000, exp: 1795104800, iss: "Fuse" },
  ],
  [
    "Unicode payload",
    { id: "user-123", name: "Émilie 李明 ليلى 🧮", roles: ["student"] },
  ],
  [
    "larger claim set",
    {
      id: "user-123",
      roles: Array.from({ length: 100 }, (_, n) => "contest-" + n),
    },
  ],
];
const cases = payloads.map(([name, payload]) => {
  const token =
    header +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url") +
    ".signature";
  return {
    name,
    make(file) {
      const decode = require(file).jwtDecode;
      return () => decode(token);
    },
    validate(value) {
      assert.deepEqual(value, payload);
    },
  };
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(fixture + "/node_modules/jwt-decode"),
    vpm: root + "/index.cjs",
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/jwt-decode-conformance/package-lock.json",
      "../../scripts/jwt-decode-conformance/node_modules/jwt-decode",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
