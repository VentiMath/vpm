"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const { createHash } = require("node:crypto");
const upstream = {
  match: require("autosuggest-highlight/match"),
  parse: require("autosuggest-highlight/parse"),
};
const vpm = require(
  process.env.VPM_AUTOSUGGEST_ENTRY || "../../packages/vautosuggest-highlight",
);
const hashes = require("./upstream/hashes.json");
let tests = 0;
for (const [name, hash] of Object.entries(hashes))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", name)))
      .digest("hex"),
    hash,
  );
for (const api of [upstream, vpm])
  for (const name of ["match", "parse"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "upstream", name + ".test.js"),
      "utf8",
    );
    vm.runInNewContext(
      source,
      {
        require: (id) => (id === "./" + name ? api[name] : require(id)),
        describe: (_name, fn) => fn(),
        it: (_name, fn) => {
          fn();
          tests++;
        },
      },
      { filename: name + ".test.js" },
    );
  }
console.log(
  `${tests / 2} unchanged upstream tests pass against both implementations.`,
);
let seed = 7351;
const random = (n) =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
const words = [
  "Practice",
  "Results",
  "Library",
  "Contest",
  "AMC",
  "BAMO",
  "déjà",
  "café",
  "über",
  "a_b",
  "a+b",
  "[tag]",
  "(x)",
  "C++",
  "11",
];
let comparisons = 0;
for (let i = 0; i < 6000; i++) {
  const text = Array.from(
    { length: 1 + random(8) },
    () => words[random(words.length)],
  ).join(" ");
  const query = Array.from({ length: 1 + random(3) }, () =>
    words[random(words.length)].slice(0, 1 + random(6)),
  ).join(" ");
  const options = {
    insideWords: !!(i & 1),
    findAllOccurrences: !!(i & 2),
    requireMatchAll: !!(i & 4),
  };
  const expected = upstream.match(text, query, options),
    actual = vpm.match(text, query, options);
  assert.deepEqual(actual, expected, JSON.stringify({ text, query, options }));
  assert.deepEqual(vpm.parse(text, actual), upstream.parse(text, expected));
  comparisons++;
}
console.log(
  `${comparisons} deterministic match/parse differential cases pass.`,
);
require("./callers.cjs");
