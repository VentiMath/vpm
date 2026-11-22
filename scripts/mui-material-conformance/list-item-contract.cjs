"use strict";
const assert = require("node:assert/strict");
const { JSDOM } = require("./paths.cjs").peer("jsdom");
const base = require("./list-item-build.cjs");
function snapshot(markup, compat) {
  const doc = JSDOM.fragment(markup);
  for (const style of doc.querySelectorAll("style")) style.remove();
  return Array.from(
    doc.querySelectorAll(
      "li,[data-title],.MuiListItem-secondaryAction,.MuiListItemSecondaryAction-root",
    ),
    (el) => {
      const classes = [...el.classList]
        .filter((c) => c.startsWith("Mui") || c.startsWith("test"))
        .filter((c) => !(compat && c === "MuiListItem-secondaryAction"))
        .sort();
      return [
        el.tagName,
        classes,
        el.textContent,
        el.querySelector("input")?.getAttribute("aria-label"),
        el
          .querySelector(".MuiListItemText-root")
          ?.classList.contains("MuiListItemText-dense"),
      ];
    },
  );
}
let count = 0;
for (const version of ["app", "current"]) {
  const [up, own] = ["upstream", "vpm"].map((lib) =>
    require(base + "/" + version + "-" + lib + "/list-item-ssr.cjs"),
  );
  for (const dense of [false, true])
    for (const disablePadding of [false, true])
      for (const disableGutters of [false, true])
        for (const divider of [false, true]) {
          const props = {
            dense,
            row: {
              disablePadding,
              disableGutters,
              divider,
              alignItems: divider ? "flex-start" : "center",
              classes: { root: "test-row", dense: "test-compact" },
            },
          };
          assert.deepEqual(
            snapshot(own.render(props), version === "app"),
            snapshot(up.render(props), version === "app"),
          );
          count++;
        }
  if (version === "current") {
    const props = {
      row: {
        slots: { root: "section", secondaryAction: "aside" },
        slotProps: {
          root: { className: "test-slot" },
          secondaryAction: (s) => ({
            className: s.secondaryAction ? "test-action" : "",
          }),
        },
      },
    };
    assert.deepEqual(snapshot(own.render(props)), snapshot(up.render(props)));
  }
}
console.log(
  count + " toolbar SSR comparisons and the current slot contract passed.",
);
