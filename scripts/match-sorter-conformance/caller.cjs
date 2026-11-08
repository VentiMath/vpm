"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const source = fs.readFileSync(
  path.join(__dirname, "node_modules/.vpm-match/caller.cjs"),
  "utf8",
);
function load(api) {
  const unit = { exports: {} };
  vm.runInThisContext("(function(require,module,exports){" + source + "\n})")(
    (id) => (id === "@tanstack/match-sorter-utils" ? api : require(id)),
    unit,
    unit.exports,
  );
  return unit.exports.MRT_FilterFns.fuzzy;
}
const fresh = require("@tanstack/match-sorter-utils"),
  app = require("match-sorter-app"),
  vpm = require(
    process.env.VPM_MATCH_ENTRY ||
      path.resolve(__dirname, "../../packages/vtanstack-match-sorter-utils"),
  );
const rows = [
  "Alice Smith",
  "José Alvarez",
  "Practice Exam",
  "Geometry 2026",
  "Renée",
  null,
  2026,
  "北京",
];
const queries = [
  "",
  "as",
  "jose",
  "renee",
  "geometry",
  "2026",
  "pa",
  "not found",
  "北京",
];
function capture(api) {
  const fuzzy = load(api);
  return rows.flatMap((value) =>
    queries.map((query) => {
      let metadata;
      const passed = fuzzy(
        { getValue: () => value },
        "name",
        query,
        (data) => (metadata = data),
      );
      return { passed, metadata, autoRemove: fuzzy.autoRemove(query) };
    }),
  );
}
assert.deepEqual(capture(vpm), capture(app));
assert.deepEqual(capture(vpm), capture(fresh));
const fuzzy = load(vpm);
for (const [value, query] of [
  ["Jose\u0301", "Jose"],
  ["Łódź", "Lodz"],
  ["Ṣaṅkara", "Sankara"],
]) {
  let metadata;
  assert.equal(
    fuzzy({ getValue: () => value }, "name", query, (x) => (metadata = x)),
    true,
  );
  assert.equal(metadata.rank, 7);
}
console.log(
  "72 unchanged MRT filter results/metadata/auto-remove values match current and app controls; three normalization corrections flow through the actual caller.",
);
