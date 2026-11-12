"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/crypto-js-conformance");
const paper = JSON.stringify(
    Array.from({ length: 150 }, (_, n) => "contest-problem-" + n),
  ),
  short = "contest-paper-version",
  payload = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZpeHR1cmUtdXNlciJ9",
  key = "public-fixture-key";
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const cases = [
  ...[
    [short, "short SHA256 digest"],
    [paper, "contest paper version SHA256"],
  ].map(([input, name]) => ({
    name,
    make(file) {
      const api = require(file);
      return () => api.SHA256(input).toString();
    },
    validate(v) {
      assert.equal(v, hash(input));
    },
  })),
  {
    name: "mock HMAC token signing",
    make(file) {
      const api = require(file);
      return () => api.enc.Base64.stringify(api.HmacSHA256(payload, key));
    },
    validate(v) {
      assert.equal(
        v,
        crypto.createHmac("sha256", key).update(payload).digest("base64"),
      );
    },
  },
  {
    name: "UTF8 and Base64 encoding",
    make(file) {
      const api = require(file);
      return () => api.enc.Base64.stringify(api.enc.Utf8.parse(paper));
    },
    validate(v) {
      assert.equal(v, Buffer.from(paper).toString("base64"));
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/crypto-js/index.js",
    vpm: root + "/index.native.cjs",
    cases,
    files: [
      "index.cjs",
      "input.cjs",
      "index.native.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/crypto-js-conformance/package-lock.json",
      "../../scripts/crypto-js-conformance/node_modules/crypto-js",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
