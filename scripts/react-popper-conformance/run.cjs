"use strict";
const assert = require("node:assert/strict"),
  React = require("react"),
  { renderToString } = require("react-dom/server");
const ours = require(require("./prepare.cjs")),
  upstream = require("react-popper");
let checks = 0;
function render(api, placement, strategy) {
  return renderToString(
    React.createElement(
      api.Manager,
      null,
      React.createElement(api.Reference, null, ({ ref }) =>
        React.createElement("button", { ref }, "Contest"),
      ),
      React.createElement(
        api.Popper,
        { placement, strategy },
        ({ ref, style, placement, arrowProps }) =>
          React.createElement(
            "div",
            { ref, style, "data-placement": placement },
            React.createElement(
              "span",
              { ref: arrowProps.ref, style: arrowProps.style },
              "Arrow",
            ),
            "Menu",
          ),
      ),
    ),
  );
}
for (const side of ["top", "bottom", "left", "right"])
  for (const align of ["", "-start", "-end"])
    for (const strategy of ["absolute", "fixed"]) {
      assert.equal(
        render(ours, side + align, strategy),
        render(upstream, side + align, strategy),
      );
      checks++;
    }
console.log(checks + " navigation render-prop SSR comparisons pass");
