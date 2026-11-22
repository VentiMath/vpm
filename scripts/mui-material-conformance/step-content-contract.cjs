"use strict";
const assert = require("node:assert/strict"),
  { peer } = require("./paths.cjs"),
  { JSDOM } = peer("jsdom"),
  base = require("./step-content-build.cjs");
function snap(markup) {
  const doc = JSDOM.fragment(markup);
  for (const style of doc.querySelectorAll("style")) style.remove();
  return Array.from(doc.querySelectorAll(".MuiStepContent-root"), (el) =>
    Array.from([el, ...el.querySelectorAll("*")], (node) => [
      node.tagName,
      [...node.classList]
        .filter((s) => s.startsWith("Mui") || s.startsWith("test"))
        .sort(),
      node.getAttribute("style"),
      node.textContent,
    ]),
  );
}
let count = 0;
for (const version of ["app", "current"]) {
  const [up, own] = ["upstream", "vpm"].map((lib) =>
    require(base + "/" + version + "-" + lib + "/step-content-ssr.cjs"),
  );
  for (const activeStep of [0, 1, 3, 6, 7])
    for (const expanded of [false, true, 2])
      for (const keep of [false, true]) {
        const options = {
          activeStep,
          expanded,
          content: {
            classes: {
              root: "test-root",
              last: "test-last",
              transition: "test-body",
            },
            slotProps: { transition: { unmountOnExit: !keep } },
          },
        };
        assert.deepEqual(snap(own.render(options)), snap(up.render(options)));
        count++;
      }
  // A custom transition receives the current slot contract, including an unsupported auto timeout.
  if (version === "current")
    for (const timeout of ["auto", 120, { enter: 60, exit: 10 }]) {
      const props = [];
      for (const lib of [up, own]) {
        const seen = [];
        function Custom(p) {
          seen.push([
            p.in,
            p.timeout,
            p.unmountOnExit,
            p.className,
            p.children,
          ]);
          return null;
        }
        lib.render({
          activeStep: 3,
          expanded: false,
          content: {
            transitionDuration: timeout,
            slots: { transition: Custom },
            slotProps: {
              transition: (s) => ({ className: s.last ? "final" : "lesson" }),
            },
          },
        });
        props.push(seen);
      }
      assert.deepEqual(...props);
      count++;
    }
}
console.log(
  count +
    " StepContent SSR and transition comparisons passed against app and current Material.",
);
