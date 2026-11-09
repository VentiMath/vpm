import assert from "node:assert/strict";
import * as up from "diff";
import * as vpm from "../../packages/vdiff/index.mjs";
const pairs = [
  ["", ""],
  ["", "abc"],
  ["abc", ""],
  ["same", "same"],
  ["a b", "a c"],
  ["a b c", "x y z"],
  ["a a b", "a b b"],
  ["a\n\nb", "a\n\nc"],
  ["你好世界。", "你好朋友。"],
  ["Hello,world!", "Hello,  world!"],
];
let count = 0;
for (const mode of ["diffWords", "diffWordsWithSpace"])
  for (const [a, b] of pairs)
    for (const options of [
      { maxEditLength: 0 },
      { maxEditLength: 1 },
      { maxEditLength: 2 },
      { maxEditLength: Infinity },
      { ignoreCase: true, oneChangePerToken: true },
      { ignoreWhitespace: false },
      ...["en", "zh", "sv"].map((locale) => ({
        intlSegmenter: new Intl.Segmenter(locale, { granularity: "word" }),
      })),
    ]) {
      const expected = up[mode](a, b, options),
        actual = vpm[mode](a, b, options);
      try {
        assert.deepEqual(actual, expected);
      } catch (e) {
        console.error({ mode, a, b, options, actual, expected });
        throw e;
      }
      count++;
    }
for (const mode of ["diffWords", "diffWordsWithSpace"])
  for (const [a, b] of pairs)
    for (const opts of [{}, { maxEditLength: 0 }, { maxEditLength: 2 }]) {
      const run = (api) =>
        new Promise((resolve) => {
          const value = api[mode](a, b, { ...opts, callback: resolve });
          assert.equal(value, undefined);
        });
      assert.deepEqual(await run(vpm), await run(up));
      count++;
    }
console.log(
  count + " option, Intl segmentation and callback comparisons match.",
);
