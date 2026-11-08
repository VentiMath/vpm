"use strict";
require("./verify.cjs");
const assert = require("node:assert/strict"),
  React = require("react"),
  { renderToStaticMarkup: render } = require("react-dom/server");
const implementations = [
  require("react-transition-group"),
  require("./load.cjs")(),
];
const snapshots = implementations.map((api) => {
  const rows = [],
    h = React.createElement;
  for (const kind of ["Transition", "CSSTransition"])
    for (const show of [false, true])
      for (const appear of [false, true])
        for (const mountOnEnter of [false, true])
          for (const unmountOnExit of [false, true]) {
            const ref = React.createRef();
            rows.push(
              render(
                h(
                  api[kind],
                  {
                    nodeRef: ref,
                    in: show,
                    appear,
                    mountOnEnter,
                    unmountOnExit,
                    timeout: 0,
                    title: "forwarded",
                  },
                  (phase) => h("span", { ref }, phase),
                ),
              ),
            );
          }
  for (const component of [null, "section"])
    for (const count of [0, 1, 5])
      for (const appear of [false, true])
        rows.push(
          render(
            h(
              api.TransitionGroup,
              { component, appear },
              Array.from({ length: count }, (_, key) =>
                h(
                  api.Transition,
                  { key, nodeRef: React.createRef(), timeout: 0 },
                  (phase) => h("span", null, phase),
                ),
              ),
            ),
          ),
        );
  return rows;
});
assert.deepEqual(snapshots[1], snapshots[0]);
console.log(
  snapshots[0].length + " SSR markup/state combinations match upstream.",
);
