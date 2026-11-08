"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const candidate = require(
  process.env.VPM_MATCH_ENTRY ||
    path.resolve(__dirname, "../../packages/vtanstack-match-sorter-utils"),
);
const controls = [
  require("@tanstack/match-sorter-utils"),
  require("match-sorter-app"),
];
const samples = [
  "",
  "Alice",
  "ALICE",
  "Alice Smith",
  "Alice-Smith",
  "a  - b",
  "Practice Exam",
  "Algebra",
  "José",
  "Renée",
  "Crème brûlée",
  "Æsir",
  "Łódź",
  "Григорий",
  "北京",
  "東京",
  "Straße",
  "😀 math",
  null,
  undefined,
  2026,
  true,
];
let comparisons = 0;
for (const original of controls)
  for (const item of samples)
    for (const query of [
      "",
      "a",
      "Ali",
      "alice",
      "as",
      "ps",
      "ma",
      "math",
      "Jose",
      "Renee",
      "creme",
      "北京",
      "😀",
      "2026",
    ])
      for (const keepDiacritics of [false, true]) {
        assert.deepEqual(
          candidate.rankItem(item, query, { keepDiacritics }),
          original.rankItem(item, query, { keepDiacritics }),
          JSON.stringify({ item, query, keepDiacritics }),
        );
        comparisons++;
      }
let seed = 913775;
const random = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const word = () =>
  Array.from({ length: random(32) }, () => "ab AB-cdé_09"[random(11)]).join("");
for (let i = 0; i < 6000; i++) {
  const row = { name: word(), aliases: [word(), word()] },
    query = word().slice(0, random(8)),
    threshold = random(9) - 1;
  const accessors = [
    () => null,
    {
      accessor: (x) => x.name,
      minRanking: random(4),
      maxRanking: random(8),
      threshold: random(8),
    },
    (x) => x.aliases,
  ];
  for (const api of controls) {
    const options = { threshold, accessors, keepDiacritics: !!random(2) };
    assert.deepEqual(
      candidate.rankItem(row, query, options),
      api.rankItem(row, query, { ...options }),
      JSON.stringify({ row, query, options }),
    );
    comparisons++;
  }
}
for (const api of controls)
  for (const rank of [0, 1, 1.25, 2, 3, 4, 5, 6, 7])
    for (const second of [0, 1, 1.1, 5, 7])
      assert.equal(
        candidate.compareItems({ rank }, { rank: second }),
        api.compareItems({ rank }, { rank: second }),
      );
assert.equal(candidate.rankItem("Jose\u0301", "José").rank, 7);
assert.equal(candidate.rankItem("Č\u0323", "C").rank, 7);
assert.equal(candidate.rankItem("Łódź", "Lodz").rank, 7);
assert.equal(candidate.rankItem("Ṣaṅkara", "Sankara").rank, 7);
assert.equal(candidate.rankItem("東京", "東京").rank, 7);
assert.equal(candidate.rankItem("が", "か").passed, false);
assert.equal(candidate.rankItem("Straße", "Strasse").passed, false);
assert.equal(
  candidate.rankItem("Jose\u0301", "José", { keepDiacritics: true }).passed,
  false,
);
const frozen = Object.freeze({ keepDiacritics: false });
assert.equal(candidate.rankItem("José", "Jose", frozen).rank, 7);
assert.deepEqual(frozen, { keepDiacritics: false });
for (const api of controls)
  assert.throws(() => api.rankItem("José", "Jose", frozen), TypeError);
const accessors = Object.freeze([
  Object.freeze({ accessor: (x) => x.tags, maxRanking: 5, threshold: 1.2 }),
]);
assert.deepEqual(
  candidate.rankItem(
    { tags: ["abc", "abc"] },
    "ac",
    Object.freeze({ accessors }),
  ),
  {
    rankedValue: "abc",
    rank: 1.5,
    accessorIndex: 0,
    accessorThreshold: 1.2,
    passed: true,
  },
);
console.log(
  comparisons +
    " current/app rank comparisons and 90 comparators pass; canonical accents, case, preserved scripts, fractional ranks and frozen options verified.",
);
