"use strict";
const { peer } = require("./paths.cjs"),
  { JSDOM } = peer("jsdom"),
  assert = require("node:assert/strict");
const base = require("./slider-build.cjs");
function snapshot(html) {
  const node = JSDOM.fragment(html).querySelector(".MuiSlider-root"),
    input = node.querySelector("input");
  const data = {
    root: Array.from(node.classList)
      .filter((c) => c.startsWith("Mui"))
      .sort(),
    range: [
      "type",
      "step",
      "min",
      "max",
      "value",
      "aria-valuenow",
      "aria-orientation",
      "aria-valuemin",
      "aria-valuemax",
      "aria-labelledby",
      "name",
      "disabled",
    ].map((k) => input.getAttribute(k)),
    marks: Array.from(node.querySelectorAll(".MuiSlider-mark")).map((e) => [
      e.style.left,
      e.classList.contains("MuiSlider-markActive"),
    ]),
    labels: Array.from(node.querySelectorAll(".MuiSlider-markLabel")).map(
      (e) => [
        e.textContent,
        e.classList.contains("font-semibold"),
        e.classList.contains("MuiSlider-markLabelActive"),
      ],
    ),
    thumb: node.querySelector(".MuiSlider-thumb").style.left,
  };
  return data;
}
let count = 0;
for (const v of ["app", "current"]) {
  const [up, own] = ["upstream", "vpm"].map((l) =>
    require(base + "/" + v + "-" + l + "/slider-ssr.cjs"),
  );
  for (const value of [11.2, 12.8, 16, 17.6, 20.8])
    for (const disabled of [true, false])
      for (const track of [false, "normal"]) {
        const props = {
          value,
          disabled,
          track,
          name: "font",
          size: "small",
          color: "secondary",
        };
        assert.deepEqual(
          snapshot(own.render(props)),
          snapshot(up.render(props)),
          JSON.stringify(props),
        );
        count++;
      }
}
console.log(
  count +
    " Slider mark, label, scalar input and accessibility snapshots match.",
);
