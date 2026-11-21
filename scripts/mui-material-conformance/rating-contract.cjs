"use strict";
const assert = require("node:assert/strict");
const dir = require("./rating-build.cjs");
const { peer } = require("./paths.cjs");
const { JSDOM } = peer("jsdom");
function snapshot(html) {
  const doc = JSDOM.fragment(html.replace(/<style[\s\S]*?<\/style>/g, ""));
  return [...doc.querySelectorAll(".MuiRating-root")].map((root) => ({
    classes: [...root.classList].filter((name) => name.startsWith("Mui")),
    role: root.getAttribute("role"),
    label: root.getAttribute("aria-label"),
    radios: [...root.querySelectorAll("input")].map((i) => [
      i.value,
      i.checked,
      i.disabled,
      i.labels.length,
      i.labels[0]?.textContent,
    ]),
    icons: [...root.querySelectorAll(".MuiRating-icon")].map((i) =>
      i.classList.contains("MuiRating-iconFilled"),
    ),
  }));
}
let count = 0;
for (const version of ["current", "app"]) {
  const up = require(dir + "/" + version + "-upstream/rating-ssr.cjs"),
    own = require(dir + "/" + version + "-vpm/rating-ssr.cjs");
  assert.deepEqual(own.classes, up.classes);
  for (const value of [null, 0, 1, 3, 5])
    for (const size of ["small", "medium", "large"])
      for (const props of [
        {},
        { disabled: true },
        { readOnly: true },
        { highlightSelectedOnly: true },
        { uncontrolled: true },
        { max: 3, getLabelText: (n) => n + " points" },
      ]) {
        const input = { size, value, ...props };
        assert.deepEqual(
          snapshot(own.render(input)),
          snapshot(up.render(input)),
          JSON.stringify(input),
        );
        count++;
      }
}
console.log(count + " whole-star Rating comparisons match Material 7 and 9");
