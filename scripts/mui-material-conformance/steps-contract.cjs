"use strict";
const assert = require("node:assert/strict"),
  { peer } = require("./paths.cjs"),
  { JSDOM } = peer("jsdom");
const base = require("./steps-build.cjs");
function snapshot(markup, legacy) {
  const root = JSDOM.fragment(markup).querySelector(".MuiStepper-root");
  const selector =
    ".MuiStepper-root,.MuiStep-root,.MuiStepConnector-root,.MuiStepConnector-line,.MuiStepLabel-root,.MuiStepLabel-iconContainer,.MuiStepIcon-root,.MuiStepIcon-text,.MuiStepLabel-labelContainer,.MuiStepLabel-label";
  return [root, ...root.querySelectorAll(selector)].map((el) => {
    const classes = [...el.classList]
      .filter(
        (c) =>
          c.startsWith("Mui") &&
          !(legacy && c === "MuiStepConnector-lineHorizontal"),
      )
      .sort();
    const tag =
      legacy &&
      classes.some((c) => c === "MuiStepper-root" || c === "MuiStep-root")
        ? "container"
        : el.localName;
    return [
      tag,
      classes,
      el.matches(".MuiStepLabel-label,.MuiStepIcon-text")
        ? el.textContent
        : null,
      el.getAttribute("aria-hidden"),
    ];
  });
}
let count = 0;
for (const v of ["current", "app"]) {
  const [up, own] = ["upstream", "vpm"].map((k) =>
    require(base + "/" + v + "-" + k + "/steps-ssr.cjs"),
  );
  for (const role of ["student", "parent", "volunteer", "other"])
    for (const activeStep of [-1, 0, 1, 2, 4, 5, 6])
      for (const nonLinear of [false, true]) {
        const props = { role, activeStep, stepper: { nonLinear } };
        assert.deepEqual(
          snapshot(own.render(props), v === "app"),
          snapshot(up.render(props), v === "app"),
        );
        count++;
      }
  if (v === "current")
    for (const orientation of ["horizontal", "vertical"])
      for (const alternativeLabel of [false, true])
        for (const activeStep of [0, 1, 2]) {
          const props = {
            role: "volunteer",
            activeStep,
            stepper: { alternativeLabel, orientation },
            step: (i) =>
              i === 1 ? { active: false, completed: true } : undefined,
            label: (i) =>
              i === 2 ? { error: true, optional: "Optional" } : undefined,
          };
          assert.deepEqual(
            snapshot(own.render(props), false),
            snapshot(up.render(props), false),
          );
          count++;
        }
}
console.log(
  count +
    " stepper comparisons matched current and app Material for role labels, connectors, numbering and state.",
);
