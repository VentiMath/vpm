import assert from "node:assert/strict";
import * as upstream from "diff";
import * as app from "diff-app";
import * as vpm from "../../packages/vdiff/index.mjs";
const strings = [
  "",
  " ",
  "\n",
  "a",
  "b",
  "a b",
  "a  b",
  "a\tb",
  "a\nb",
  "a X b",
  "a X  b",
  " a b ",
  "a b a",
  "b a b",
  "red, blue",
  "red blue",
  "a+b=2",
  "a+b=3",
  "\\frac{x+1}{2}",
  "\\frac{x-1}{2}",
  "café déjà vu",
  "a\u00adb",
  "a×b",
  "😀 text",
  "你好，世界",
  "a\n\nb",
];
let checks = 0;
for (const mode of ["diffWords", "diffWordsWithSpace"])
  for (const a of strings)
    for (const b of strings)
      for (const options of [
        {},
        { ignoreCase: true },
        { oneChangePerToken: true },
      ]) {
        const expected = upstream[mode](a, b, options),
          actual = vpm[mode](a, b, options);
        try {
          assert.deepEqual(actual, expected);
        } catch (e) {
          console.error({ mode, a, b, options, expected, actual });
          throw e;
        }
        checks++;
      }
console.log(checks + " current word/space/option snapshots match.");
const { callerPairs, versionChanges } = await import("./cases.mjs");
for (const [a, b] of callerPairs) {
  assert.deepEqual(vpm.diffWords(a, b), upstream.diffWords(a, b));
  assert.deepEqual(vpm.diffWords(a, b), app.diffWords(a, b));
}
for (const [a, b] of versionChanges) {
  assert.deepEqual(vpm.diffWords(a, b), upstream.diffWords(a, b));
  assert.notDeepEqual(vpm.diffWords(a, b), app.diffWords(a, b));
}
console.log(
  callerPairs.length +
    " actual-caller-shaped cases match app8 and current9; two tokenization upgrades are explicit.",
);
