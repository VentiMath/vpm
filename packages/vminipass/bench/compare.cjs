"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, "..");
const upstream = path.resolve(
  __dirname,
  "../../../scripts/minipass-conformance/node_modules/minipass",
);
const cases = [
  {
    name: "object queue 1000",
    make(file) {
      const { Minipass } = require(file);
      return () => {
        const s = new Minipass({ objectMode: true });
        for (let i = 0; i < 1000; i++) s.write(i);
        let sum = 0;
        while (s.bufferLength) sum += s.read();
        s.end();
        return sum;
      };
    },
    validate: (n) => assert.equal(n, 499500),
  },
  {
    name: "flowing object writes 1000",
    make(file) {
      const { Minipass } = require(file);
      return () => {
        const s = new Minipass({ objectMode: true });
        let sum = 0;
        s.on("data", (x) => (sum += x));
        for (let i = 0; i < 1000; i++) s.write(i);
        s.end();
        return sum;
      };
    },
    validate: (n) => assert.equal(n, 499500),
  },
  {
    name: "buffer concat 128 chunks",
    async: true,
    make(file) {
      const { Minipass } = require(file),
        chunk = Buffer.alloc(32, 1);
      return () => {
        const s = new Minipass();
        for (let i = 0; i < 128; i++) s.write(chunk);
        s.end();
        return s.concat();
      };
    },
    validate: (b) => assert.equal(b.length, 4096),
  },
  {
    name: "UTF8 decoder 64 chunks",
    make(file) {
      const { Minipass } = require(file),
        bytes = Buffer.from("a🦋");
      return () => {
        const s = new Minipass({ encoding: "utf8" });
        for (let i = 0; i < 64; i++) s.write(bytes);
        return s.read();
      };
    },
    validate: (s) => assert.equal(s, "a🦋".repeat(64)),
  },
  {
    name: "object collect 100",
    async: true,
    make(file) {
      const { Minipass } = require(file);
      return () => {
        const s = new Minipass({ objectMode: true });
        for (let i = 0; i < 100; i++) s.write(i);
        s.end();
        return s.collect();
      };
    },
    validate: (a) => assert.equal(a.length, 100),
  },
  {
    name: "object async iterator 100",
    async: true,
    make(file) {
      const { Minipass } = require(file);
      return async () => {
        const s = new Minipass({ objectMode: true });
        for (let i = 0; i < 100; i++) s.write(i);
        s.end();
        let sum = 0;
        for await (const x of s) sum += x;
        return sum;
      };
    },
    validate: (n) => assert.equal(n, 4950),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "bench/compare.cjs",
      "../../scripts/minipass-conformance/package-lock.json",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
