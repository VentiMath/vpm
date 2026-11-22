"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const source = fs.readFileSync(process.argv[2]);
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  "24c7fed1195c482faaefd5c1e7eb821c5ee1fb6de07ecdbaa64b56a99da22c08",
  "Expected Unicode 17.0.0 DerivedCoreProperties.txt",
);
const classes = new Uint8Array(0x110000);
for (const match of source
  .toString()
  .matchAll(
    /^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*(ID_Start|ID_Continue)\s*#/gm,
  )) {
  const [, lo, hi = lo, property] = match;
  for (let i = parseInt(lo, 16); i <= parseInt(hi, 16); i++)
    classes[i] |= property === "ID_Start" ? 3 : 1;
}
// ECMAScript's additions to Unicode ID_Start and ID_Continue.
for (const c of [36, 95]) classes[c] = 3;
for (const c of [0x200c, 0x200d]) classes[c] |= 1;
const pages = Buffer.alloc(classes.length / 256),
  unique = new Map();
for (let p = 0; p < pages.length; p++) {
  const bits = Buffer.alloc(64);
  for (let i = 0; i < 256; i++)
    bits[i >> 2] |= classes[p * 256 + i] << ((i % 4) * 2);
  const key = bits.toString("base64");
  if (!unique.has(key)) unique.set(key, unique.size);
  pages[p] = unique.get(key);
}
assert.ok(unique.size <= 256);
const blocks = Buffer.concat(
  [...unique.keys()].map((key) => Buffer.from(key, "base64")),
);
const output = path.resolve(
  __dirname,
  "../../packages/vbabel-helper-validator-identifier/unicode.cjs",
);
fs.writeFileSync(
  output,
  "// Generated from Unicode 17.0.0 by scripts/source-map-conformance/build-identifier-tables.cjs.\n// Data license: UNICODE-LICENSE.txt.\nmodule.exports = {\n  pages: " +
    JSON.stringify(pages.toString("base64")) +
    ",\n  blocks: " +
    JSON.stringify(blocks.toString("base64")) +
    "\n};\n",
);
