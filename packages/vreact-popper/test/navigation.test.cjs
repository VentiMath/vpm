"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/react-popper-conformance",
);
const React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  api = require(require(fixture + "/prepare.cjs"));
const pop = (props = {}) =>
  React.createElement(api.Popper, {
    ...props,
    children: ({ ref, style, placement }) =>
      React.createElement(
        "div",
        { ref, style, "data-placement": placement },
        "Menu",
      ),
  });
test("Manager introduces no markup and Reference exposes a ref", () => {
  assert.equal(
    renderToString(
      React.createElement(
        api.Manager,
        null,
        React.createElement(api.Reference, {
          children: ({ ref }) => {
            assert.equal(typeof ref, "function");
            return React.createElement("button", { ref }, "Contest");
          },
        }),
      ),
    ),
    "<button>Contest</button>",
  );
});
test("reference outside manager reports the configuration error", () => {
  assert.throws(
    () =>
      renderToString(
        React.createElement(api.Reference, { children: () => null }),
      ),
    /requires a Manager/,
  );
});
test("server rendering requires no browser global and preserves placement and strategy", () => {
  assert.equal(
    renderToString(pop({ placement: "right", strategy: "fixed" })),
    '<div style="position:fixed;left:0;top:0" data-placement="right">Menu</div>',
  );
});
test("unsupported custom modifier execution is rejected rather than silently ignored", () => {
  assert.throws(
    () =>
      renderToString(
        pop({
          modifiers: [
            {
              name: "custom",
              fn() {
                throw Error("must not execute");
              },
            },
          ],
        }),
      ),
    /outside vreact-popper navigation scope/,
  );
});
test("unsupported placement and strategy fail explicitly", () => {
  assert.throws(
    () => renderToString(pop({ placement: "auto" })),
    /explicit side/,
  );
  assert.throws(() => renderToString(pop({ strategy: "sticky" })), /strategy/);
});
test("missing anchors and closed render props produce no positioning side effects", () => {
  let called = 0;
  assert.equal(
    renderToString(
      React.createElement(api.Popper, {
        onFirstUpdate: () => called++,
        children: () => null,
      }),
    ),
    "",
  );
  assert.equal(called, 0);
});
