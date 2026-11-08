"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const highlight = require(process.env.VPM_HIGHLIGHT_ENTRY || "..").default;
const plain = (options) =>
  highlight(options).map(({ text, match }) => [text, match]);
test("stable unique range keys and detached results", () => {
  const input = { text: "aba aba", query: "a" };
  const a = highlight(input),
    b = highlight(input);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((x) => x.key)).size, a.length);
  a[0].text = "mutated";
  a.pop();
  assert.deepEqual(highlight(input), b);
  assert.notDeepEqual(
    highlight({ ...input, query: "ab" }).map((x) => x.key),
    b.map((x) => x.key),
  );
});
test("adjacent literal matches are all highlighted", () => {
  assert.deepEqual(plain({ text: "aaa aa", query: "a" }), [
    ["a", true],
    ["a", true],
    ["a", true],
    [" ", false],
    ["a", true],
    ["a", true],
  ]);
  assert.deepEqual(plain({ text: "foobar", query: "foo bar" }), [
    ["foo", true],
    ["bar", true],
  ]);
});
test("regex captures never remove, duplicate, or misclassify source text", () => {
  for (const query of [
    /cat|dog/,
    /(cat|dog)/,
    /((cat)|(dog))/,
    /(?:cat|dog)/,
    "/(cat|dog)/",
  ])
    assert.deepEqual(plain({ text: "cat dog", query }), [
      ["cat", true],
      [" ", false],
      ["dog", true],
    ]);
  const query = /(cat)/g;
  query.lastIndex = 7;
  highlight({ text: "cat cat", query });
  assert.equal(query.lastIndex, 7);
  assert.deepEqual(plain({ text: "Ab aB", query: /ab/ }), [["Ab aB", false]]);
  assert.deepEqual(plain({ text: "Ab aB", query: /ab/i }), [
    ["Ab", true],
    [" ", false],
    ["aB", true],
  ]);
});
test("zero-width patterns terminate without splitting Unicode or dropping content", () => {
  for (const query of [/(?:)/gu, /(?=.)/gu, /$/g, /^/g, "//"])
    assert.deepEqual(plain({ text: "😀xy", query }), [["😀xy", false]]);
  assert.deepEqual(plain({ text: "abc", query: /(?=b)|b/g }), [["abc", false]]);
});
test("literal escaping, order, case, empty strings and clipping contract", () => {
  assert.deepEqual(plain({ text: "A+B a.b [C]", query: "a+b a.b [c]" }), [
    ["A+B", true],
    [" ", false],
    ["a.b", true],
    [" ", false],
    ["[C]", true],
  ]);
  assert.deepEqual(
    plain({ text: "foo bar", query: "foo  bar", matchExactly: true }),
    [["foo bar", false]],
  );
  assert.deepEqual(plain({ text: "foobar", query: "foo foobar" }), [
    ["foo", true],
    ["bar", false],
  ]);
  assert.deepEqual(plain({ text: "", query: "a" }), []);
  assert.deepEqual(plain({ text: "", query: " " }), [["", false]]);
  assert.deepEqual(
    plain({ text: "a one two three four five b", query: "a b", clipBy: 3 }),
    [
      ["a", true],
      [" one two ... four five ", false],
      ["b", true],
    ],
  );
});
test("bad inputs reject without poisoning the one-pattern cache", () => {
  for (const clipBy of [-1, NaN, Infinity, 0.5, "2"])
    assert.throws(
      () => highlight({ text: "a", query: "a", clipBy }),
      RangeError,
    );
  for (const query of [null, {}, 1])
    assert.throws(() => highlight({ text: "a", query }), TypeError);
  assert.throws(() => highlight({ text: 12, query: "a" }), TypeError);
  assert.throws(() => highlight({ text: "a", query: "/[/" }), SyntaxError);
  assert.deepEqual(plain({ text: "a", query: "a" }), [["a", true]]);
});
