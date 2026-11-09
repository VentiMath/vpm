import * as upstream from "diff";
import * as app from "diff-app";
import * as vpm from "../../packages/vdiff/index.mjs";
import { callerPairs, versionChanges } from "./cases.mjs";
function same(a, b) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw Error("Browser diff mismatch");
}
window.runDiff = async () => {
  let count = 0;
  for (const [a, b] of [...callerPairs, ...versionChanges]) {
    const actual = vpm.diffWords(a, b),
      expected = upstream.diffWords(a, b);
    same(actual, expected);
    if (count < callerPairs.length) same(actual, app.diffWords(a, b));
    const root = document.createElement("div");
    for (const part of actual) {
      const span = document.createElement("span");
      span.dataset.kind = part.added
        ? "added"
        : part.removed
          ? "removed"
          : "common";
      span.textContent = part.value;
      root.append(span);
    }
    document.body.append(root);
    if (root.querySelector("script,img"))
      throw Error("Text was interpreted as HTML");
    if (root.textContent !== actual.map((p) => p.value).join(""))
      throw Error("Fragments lost in caller rendering");
    count++;
  }
  for (const locale of ["en", "zh", "sv"])
    for (const [a, b] of [
      ["你好世界", "你好朋友"],
      ["can't stop", "cannot stop"],
      ["a\n\nb", "a\n\nc"],
    ]) {
      const options = {
        intlSegmenter: new Intl.Segmenter(locale, { granularity: "word" }),
      };
      same(vpm.diffWords(a, b, options), upstream.diffWords(a, b, options));
      count++;
    }
  let timerRan = false;
  setTimeout(() => {
    timerRan = true;
  }, 0);
  const result = await new Promise((callback) =>
    vpm.diffWords("a b", "a c", { callback }),
  );
  if (!timerRan) throw Error("Callback blocked browser timer");
  same(result, upstream.diffWords("a b", "a c"));
  return { comparisons: count, literalText: true, deferredCallback: true };
};
