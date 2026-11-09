"use strict";
const assert = require("node:assert/strict"),
  { test } = require("node:test");
const { diffWords, diffWordsWithSpace } = require(
  process.env.VDIFF_ENTRY || "../index.cjs",
);
const change = (value, count, kind = 0) => ({
  count,
  added: kind === 1,
  removed: kind === -1,
  value,
});
test("problem wording replacement retains surrounding text", () =>
  assert.deepEqual(
    diffWords("Find the sum of x and y.", "Find the product of x and y."),
    [
      change("Find the ", 2),
      change("sum", 1, -1),
      change("product", 1, 1),
      change(" of x and y.", 5),
    ],
  ));
test("math punctuation is a separate change in the current API", () =>
  assert.deepEqual(diffWords("a×b", "a÷b"), [
    change("a", 1),
    change("×", 1, -1),
    change("÷", 1, 1),
    change("b", 1),
  ]));
test("literal HTML and TeX remain data, including astral characters", () => {
  const a = "<script>alert(1)</script> \\frac{x+1}{2} 😀",
    b = "<strong>literal</strong> \\frac{x-1}{2} 🥳";
  const result = diffWordsWithSpace(a, b);
  assert.equal(
    result
      .filter((c) => !c.added)
      .map((c) => c.value)
      .join(""),
    a,
  );
  assert.equal(
    result
      .filter((c) => !c.removed)
      .map((c) => c.value)
      .join(""),
    b,
  );
  assert.ok(
    result.every(
      (c) =>
        !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
          c.value,
        ),
    ),
  );
});
test("default matching ignores whitespace but takes new spacing", () =>
  assert.deepEqual(diffWords("  a\tb\n", "a  b "), [change("a  b ", 2)]));
test("whitespace-aware comparison preserves tabs and CRLF", () => {
  const a = "a\t\r\nb",
    b = "a \nb";
  const r = diffWordsWithSpace(a, b);
  assert.equal(
    r
      .filter((c) => !c.added)
      .map((c) => c.value)
      .join(""),
    a,
  );
  assert.equal(
    r
      .filter((c) => !c.removed)
      .map((c) => c.value)
      .join(""),
    b,
  );
  assert.deepEqual(diffWords(a, b, { ignoreWhitespace: false }), r);
});
test("empty, whitespace-only and identity cases", () => {
  assert.deepEqual(diffWords("", ""), []);
  assert.deepEqual(diffWords("", " \t"), [change(" \t", 1, 1)]);
  assert.deepEqual(diffWords(" \t", "\n"), [change("\n", 1)]);
  assert.deepEqual(diffWords("a a", "a a"), [change("a a", 2)]);
});
test("case-insensitive equality emits the new spelling", () =>
  assert.deepEqual(diffWords("CAFÉ", "café", { ignoreCase: true }), [
    change("café", 1),
  ]));
test("per-token output preserves the documented overlapping spaces", () =>
  assert.deepEqual(diffWords("a b", "a b", { oneChangePerToken: true }), [
    change("a ", 1),
    change(" b", 1),
  ]));
test("Intl word segmenter and granularity validation", () => {
  assert.deepEqual(
    diffWords("can't", "can't", {
      intlSegmenter: new Intl.Segmenter("en", { granularity: "word" }),
    }),
    [change("can't", 1)],
  );
  assert.throws(
    () =>
      diffWords("a", "b", {
        intlSegmenter: new Intl.Segmenter("en", { granularity: "grapheme" }),
      }),
    /word granularity/,
  );
});
test("edit bounds return no partial result", () => {
  assert.equal(diffWords("a b", "a c", { maxEditLength: 1 }), undefined);
  assert.deepEqual(
    diffWords("a b", "a c", { maxEditLength: 2 }),
    diffWords("a b", "a c"),
  );
  assert.deepEqual(diffWords("a", "a", { maxEditLength: 0 }), [change("a", 1)]);
  assert.equal(diffWords("", "a", { maxEditLength: 0 }), undefined);
});
test("zero deadline permits equality but never a changed search", () => {
  assert.deepEqual(diffWords("same", "same", { timeout: 0 }), [
    change("same", 1),
  ]);
  assert.equal(diffWords("a", "b", { timeout: 0 }), undefined);
  assert.equal(diffWords("", "b", { timeout: 0 }), undefined);
  assert.equal(
    diffWords("a ".repeat(2000), "b ".repeat(2000), { timeout: 0 }),
    undefined,
  );
});
test("large disjoint input is exact and bounded", () => {
  const a = "alpha ".repeat(1000),
    b = "beta ".repeat(1000);
  assert.deepEqual(diffWords(a, b), [change(a, 1000, -1), change(b, 1000, 1)]);
  assert.equal(diffWords(a, b, { maxEditLength: 1999 }), undefined);
});
test("configuration fails explicitly before work", () => {
  for (const options of [
    null,
    [],
    3,
    { callback: 1 },
    { maxEditLength: -1 },
    { maxEditLength: 0.5 },
    { maxEditLength: NaN },
    { timeout: -1 },
    { timeout: NaN },
    { timeout: "1" },
  ])
    assert.throws(() => diffWords("a", "b", options), TypeError);
  assert.throws(() => diffWords({}, "b"), TypeError);
});
test("options remain immutable", () => {
  const options = Object.freeze({ ignoreCase: true, maxEditLength: 4 });
  diffWords("a", "B", options);
  assert.deepEqual(options, { ignoreCase: true, maxEditLength: 4 });
});
test("callback is deferred, called once, and returns the same changes", async () => {
  let sync = true,
    calls = 0;
  const result = await new Promise((resolve) => {
    assert.equal(
      diffWords("a b", "a c", (changes) => {
        calls++;
        assert.equal(sync, false);
        resolve(changes);
      }),
      undefined,
    );
    sync = false;
  });
  assert.deepEqual(result, diffWords("a b", "a c"));
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls, 1);
});
test("callback handles aborted work and unchanged empty text", async () => {
  for (const [a, b, options] of [
    ["a", "b", { maxEditLength: 1 }],
    ["", "", {}],
    ["a", "b", { timeout: 0 }],
  ]) {
    const expected = diffWords(a, b, options);
    assert.deepEqual(
      await new Promise((callback) =>
        diffWords(a, b, { ...options, callback }),
      ),
      expected,
    );
  }
});
