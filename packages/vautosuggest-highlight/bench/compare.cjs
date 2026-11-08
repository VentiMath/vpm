"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/autosuggest-conformance");
const upstream = path.join(fixture, "node_modules/autosuggest-highlight");
function load(file) {
  return file === upstream
    ? { match: require(file + "/match"), parse: require(file + "/parse") }
    : require(file);
}
const cases = [];
for (const [name, inputs] of [
  [
    "navigation prefixes",
    [
      ["Practice & Library", "pr"],
      ["Results", "res"],
      ["AMC 10", "amc"],
      ["Duke Math Meet", "math"],
    ],
  ],
  [
    "navigation misses",
    [
      ["Practice & Library", "xyz"],
      ["Results", "nope"],
      ["AMC 10", "12"],
      ["Duke Math Meet", "123"],
    ],
  ],
  [
    "multiple query terms",
    [
      ["Albert Einstein", "e a"],
      ["Practice & Library", "lib pr"],
      ["Some sweet text", "s s"],
    ],
  ],
  [
    "accented and ligature labels",
    [
      ["Déjà vu", "deja"],
      ["œuvre pompes", "pompes"],
      ["ma sœur", "soe"],
      ["Ångström café", "cafe"],
    ],
  ],
  [
    "all occurrences inside words",
    [
      ["some sweet text", "e"],
      ["bananana banana", "an"],
      ["algebra Algebra algebra", "al"],
    ],
  ],
])
  cases.push({
    name,
    make(file) {
      const { match } = load(file);
      let i = 0;
      const options = name.startsWith("all")
        ? { insideWords: true, findAllOccurrences: true }
        : undefined;
      return () => {
        const [text, query] = inputs[i++ % inputs.length];
        return match(text, query, options);
      };
    },
    validate: (x) => assert(Array.isArray(x) && x.every((r) => r.length === 2)),
  });
cases.push({
  name: "split highlight parts",
  make(file) {
    const { parse } = load(file);
    const inputs = [
      [
        "Practice & Library",
        [
          [0, 2],
          [11, 14],
        ],
      ],
      ["Results", [[0, 3]]],
      ["No matches", []],
    ];
    let i = 0;
    return () => {
      const [text, ranges] = inputs[i++ % inputs.length];
      return parse(text, ranges);
    };
  },
  validate: (x) =>
    assert(
      x.length &&
        x.every(
          (p) => typeof p.text === "string" && typeof p.highlight === "boolean",
        ),
    ),
});
cases.push({
  name: "navigation search and rendered parts",
  make(file) {
    const { match, parse } = load(file);
    const labels = [
      "Practice & Library",
      "Results",
      "AMC 8",
      "AMC 10",
      "AMC 12",
      "BAMO",
      "HMMT",
      "Duke Math Meet",
      "Proctor Manual",
      ...Array.from({ length: 20 }, (_, i) => "Practice " + i),
    ];
    const queries = ["pr", "amc", "math", "results", "nope"];
    let i = 0;
    return () => {
      const query = queries[i++ % queries.length],
        output = [];
      for (const label of labels) {
        if (match(label, query).length)
          output.push(parse(label, match(label, query)));
        if (output.length === 10) break;
      }
      return output;
    };
  },
  validate: (x) => assert(Array.isArray(x) && x.length <= 10),
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "package.json",
      "PROVENANCE.json",
      "index.cjs",
      "index.mjs",
      "fold.cjs",
      "match.cjs",
      "parse.cjs",
      "match.mjs",
      "parse.mjs",
      "index.d.cts",
      "index.d.mts",
      "match.d.cts",
      "match.d.mts",
      "parse.d.cts",
      "parse.d.mts",
      "bench/compare.cjs",
      "../../scripts/autosuggest-conformance/package-lock.json",
      "../../scripts/autosuggest-conformance/node_modules/autosuggest-highlight",
      "../../scripts/autosuggest-conformance/node_modules/remove-accents",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
