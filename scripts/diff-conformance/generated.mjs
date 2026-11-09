import assert from "node:assert/strict";
import * as upstream from "diff";
import * as vpm from "../../packages/vdiff/index.mjs";
let seed = 93874;
const rand = (n) => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
const words = [
  "a",
  "b",
  "a",
  "café",
  "θ",
  "x",
  "+",
  "{",
  "}",
  "\\frac",
  "😀",
  "a\u00adb",
  "×",
  "你好",
];
const spaces = ["", " ", "  ", "\t", "\n", "\r\n"];
const make = () =>
  Array.from(
    { length: rand(14) },
    () => spaces[rand(spaces.length)] + words[rand(words.length)],
  ).join("") + spaces[rand(spaces.length)];
let count = 0;
for (let i = 0; i < 2000; i++) {
  const a = make(),
    b = make();
  for (const mode of ["diffWords", "diffWordsWithSpace"]) {
    const options =
      i % 7 === 0
        ? { oneChangePerToken: true }
        : i % 5 === 0
          ? { ignoreCase: true }
          : {};
    const expected = upstream[mode](a, b, options),
      actual = vpm[mode](a, b, options);
    try {
      assert.deepEqual(actual, expected);
    } catch (e) {
      console.error({ a, b, mode, options, actual, expected });
      throw e;
    }
    if (mode === "diffWordsWithSpace") {
      assert.equal(
        actual
          .filter((c) => !c.added)
          .map((c) => c.value)
          .join(""),
        a,
      );
      assert.equal(
        actual
          .filter((c) => !c.removed)
          .map((c) => c.value)
          .join(""),
        b,
      );
    }
    count++;
  }
}
console.log(
  count +
    " deterministic generated exact comparisons match, with lossless space-mode reconstruction.",
);
