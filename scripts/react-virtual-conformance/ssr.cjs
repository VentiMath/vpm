"use strict";
const assert = require("node:assert/strict"),
  { load, peer, candidate } = require("./load.cjs");
const React = peer("react"),
  render = peer("react-dom/server").renderToStaticMarkup;
const implementations = [
  load(require.resolve("@tanstack/react-virtual")),
  load(require.resolve("react-virtual-app")),
  candidate(),
];
const results = implementations.map((api) => {
  const values = [];
  for (const hook of ["useVirtualizer", "useWindowVirtualizer"])
    for (const count of [0, 1, 30, 300])
      for (const horizontal of [false, true])
        for (const enabled of [false, true]) {
          function View() {
            const v = api[hook]({
              count,
              estimateSize: (i) => 20 + (i % 3),
              getScrollElement: () => null,
              initialRect: { height: 100, width: 150 },
              initialOffset: 0,
              horizontal,
              enabled,
              overscan: 2,
            });
            return React.createElement(
              "main",
              { "data-total": v.getTotalSize() },
              v
                .getVirtualItems()
                .map((x) =>
                  React.createElement(
                    "span",
                    { key: x.key, "data-start": x.start, "data-size": x.size },
                    x.index,
                  ),
                ),
            );
          }
          values.push(render(React.createElement(View)));
        }
  return values;
});
assert.deepEqual(results[2], results[0]);
assert.deepEqual(results[2], results[1]);
assert.throws(
  () =>
    render(
      React.createElement(() => {
        implementations[2].useVirtualizer({
          count: 0,
          getScrollElement: () => null,
          estimateSize: () => 20,
          directDomUpdates: true,
        });
        return null;
      }),
    ),
  /directDomUpdates/,
);
console.log(
  results[0].length +
    " SSR element/window horizontal/vertical/disabled snapshots match current and app controls.",
);
