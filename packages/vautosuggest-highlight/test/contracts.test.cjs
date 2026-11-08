"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { match, parse } = require(process.env.VPM_AUTOSUGGEST_ENTRY || "..");

test("ordered terms, all options, punctuation and adjacent highlights", () => {
  assert.deepEqual(match("Albert Einstein", "e a"), [
    [0, 1],
    [7, 8],
  ]);
  assert.deepEqual(match("foobar", "foo bar"), [
    [0, 3],
    [3, 6],
  ]);
  assert.deepEqual(match("foobar foo", "foo foobar"), [[0, 3]]);
  assert.deepEqual(match("a_b a-b", "b", { findAllOccurrences: true }), [
    [6, 7],
  ]);
  assert.deepEqual(match("a+a [b] (c)", "a+a [b] (c)"), [
    [0, 3],
    [4, 7],
    [8, 11],
  ]);
  assert.deepEqual(
    match("banana", "an", { insideWords: true, findAllOccurrences: true }),
    [
      [1, 3],
      [3, 5],
    ],
  );
  assert.deepEqual(match("abc", "a absent", { requireMatchAll: true }), []);
  assert.deepEqual(
    match("aaa", "a a", { findAllOccurrences: true, requireMatchAll: true }),
    [],
  );
  assert.deepEqual(
    parse("abcd", [
      [0, 2],
      [2, 4],
    ]),
    [
      { text: "ab", highlight: true },
      { text: "cd", highlight: true },
    ],
  );
  assert.deepEqual(parse("", []), [{ text: "", highlight: false }]);
});

test("Unicode offsets preserve emoji, accents and ligatures", () => {
  assert.deepEqual(match("😀 café", "cafe"), [[3, 7]]);
  assert.deepEqual(match("Cafe\u0301 noir", "cafe"), [[0, 5]]);
  assert.deepEqual(match("Cafe\u0301 noir", "noir"), [[6, 10]]);
  assert.deepEqual(match("œuvre pompes", "pompes"), [[6, 12]]);
  assert.deepEqual(match("ma sœur", "so"), [[3, 4]]);
  assert.deepEqual(match("ma sœur", "soe"), [[3, 5]]);
  assert.deepEqual(match("œuvre", "o"), []);
  assert.deepEqual(match("Ḃar", "bar"), [[0, 3]]);
  assert.deepEqual(match("БАЗИЛИК", "базил"), [[0, 5]]);
  assert.deepEqual(match("ΟΣ", "οσ"), [[0, 2]]);
  assert.deepEqual(match("ά", "α"), []);
});

test("parse validates ranges and leaves caller-owned inputs unchanged", () => {
  const ranges = Object.freeze([Object.freeze([1, 3])]);
  assert.deepEqual(parse("abcd", ranges), [
    { text: "a", highlight: false },
    { text: "bc", highlight: true },
    { text: "d", highlight: false },
  ]);
  for (const ranges of [
    [[0, 5]],
    [[-1, 2]],
    [[1, 1]],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [2, 3],
      [0, 1],
    ],
    [[0, NaN]],
    [[0, Infinity]],
    [[0.5, 2]],
    [[0]],
    [null],
  ])
    assert.throws(() => parse("abcd", ranges), RangeError);
  assert.throws(() => match(null, "a"), TypeError);
  assert.throws(() => match("a", 2), TypeError);
});

test("seeded Unicode results always reconstruct the complete source", () => {
  let seed = 82611;
  const random = (n) =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
  const tokens = [
    "abc",
    "déjà",
    "œuf",
    "😀",
    "Cafe\u0301",
    "a_b",
    "[x]",
    "Йога",
    "中文",
    "𝒙",
    "𐐀",
  ];
  for (let i = 0; i < 3000; i++) {
    const text = Array.from(
      { length: 1 + random(8) },
      () => tokens[random(tokens.length)],
    ).join(" ");
    const query = tokens[random(tokens.length)].slice(0, 1 + random(6));
    const ranges = match(text, query, {
      insideWords: !!random(2),
      findAllOccurrences: !!random(2),
      requireMatchAll: !!random(2),
    });
    const parts = parse(text, ranges);
    assert.equal(parts.map((p) => p.text).join(""), text);
    for (const [a, b] of ranges) {
      assert(
        !(
          a &&
          /[\uDC00-\uDFFF]/.test(text[a]) &&
          /[\uD800-\uDBFF]/.test(text[a - 1])
        ),
      );
      assert(
        !(
          b < text.length &&
          /[\uDC00-\uDFFF]/.test(text[b]) &&
          /[\uD800-\uDBFF]/.test(text[b - 1])
        ),
      );
    }
  }
});
