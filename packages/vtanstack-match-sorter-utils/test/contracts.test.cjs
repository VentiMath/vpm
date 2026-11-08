"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { rankItem, compareItems, rankings } = require("../index.cjs");
test("named ranks and subsequences", () => {
  for (const [item, query, rank] of [
    ["Alice", "Alice", 7],
    ["Alice", "alice", 6],
    ["Alice", "Ali", 5],
    ["Alice Smith", "Smith", 4],
    ["Alice", "lic", 3],
    ["Alice Smith", "as", 2],
    ["abc", "ac", 1.5],
    ["abc", "z", 0],
  ])
    assert.equal(rankItem(item, query).rank, rank);
  assert.equal(compareItems({ rank: 7 }, { rank: 2 }), -1);
  assert.equal(rankings.MATCHES, 1);
});
test("canonical Latin accents, case and unrelated scripts", () => {
  for (const [s, q] of [
    ["José", "Jose"],
    ["Jose\u0301", "José"],
    ["Łódź", "Lodz"],
    ["Č\u0323", "C"],
    ["Ṣaṅkara", "Sankara"],
    ["ǢǣǾǿ", "AEaeOo"],
  ])
    assert.equal(rankItem(s, q).rank, 7);
  assert.equal(rankItem("が", "か").passed, false);
  assert.equal(rankItem("Straße", "Strasse").passed, false);
});
test("no option mutations; stable flattened accessors", () => {
  const options = Object.freeze({
    accessors: Object.freeze([() => null, () => ["alpha", "alphabet"]]),
    threshold: 1.2,
  });
  assert.deepEqual(rankItem({}, "alp", options), {
    rankedValue: "alpha",
    rank: 5,
    accessorIndex: 0,
    accessorThreshold: 1.2,
    passed: true,
  });
});
