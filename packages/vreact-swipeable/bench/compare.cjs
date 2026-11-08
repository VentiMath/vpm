"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/swipeable-conformance"),
  upstream = path.join(fixture, "node_modules/react-swipeable"),
  mount = require(path.join(fixture, "harness.cjs"));
const cases = [];
for (const [name, extra] of [
  ["ten-move touch gesture", {}],
  [
    "rotated directional touch gesture",
    { rotationAngle: 90, delta: { up: 15 } },
  ],
  ["mouse drag and cleanup", { trackMouse: true }],
])
  cases.push({
    name,
    make(file) {
      let end;
      const f = mount(file, { ...extra, onSwiped: (d) => (end = d) });
      const events = Array.from({ length: 12 }, (_, i) => ({
        type: i === 0 ? "touchstart" : i === 11 ? "touchend" : "touchmove",
        touches:
          i === 11
            ? []
            : [{ identifier: 1, clientX: 100 + i * 5, clientY: 100 }],
        timeStamp: 1 + i * 10,
        cancelable: true,
        preventDefault() {},
      }));
      if (extra.trackMouse)
        for (let i = 0; i < events.length; i++) {
          const e = events[i];
          delete e.touches;
          e.type = i === 0 ? "mousedown" : i === 11 ? "mouseup" : "mousemove";
          e.clientX = 100 + i * 5;
          e.clientY = 100;
          e.button = 0;
          e.currentTarget = f.node;
        }
      return () => {
        for (let i = 0; i < events.length; i++) {
          const e = events[i];
          if (extra.trackMouse) {
            if (i === 0) f.handlers.onMouseDown(e);
            else f.doc.dispatch(e.type, e);
          } else f.node.dispatch(e.type, e);
        }
        return end;
      };
    },
    validate(data) {
      assert(data);
      assert(Math.abs(data.absX + data.absY - 50) < 1e-9);
      assert.equal(data.first, false);
    },
  });
cases.push({
  name: "hook callback rerender with unchanged listeners",
  make(file) {
    const callback = () => {};
    const f = mount(file, { onSwiped: callback });
    return () => f.render({ onSwiped: callback });
  },
  validate(h) {
    assert.equal(typeof h.ref, "function");
  },
});
cases.push({
  name: "actual React server hook initialization",
  make(file) {
    delete globalThis.document;
    const React = require(path.join(fixture, "node_modules/react")),
      render = require(
        path.join(fixture, "node_modules/react-dom/server"),
      ).renderToStaticMarkup,
      api = require(path.join(fixture, "load.cjs"))(file, React);
    function View() {
      return React.createElement(
        "div",
        api.useSwipeable({ onSwipedRight() {} }),
      );
    }
    return () => render(React.createElement(View));
  },
  validate(html) {
    assert.equal(html, "<div></div>");
  },
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "package.json",
      "PROVENANCE.json",
      "index.cjs",
      "index.mjs",
      "index.d.ts",
      "gesture.cjs",
      "bench/compare.cjs",
      "../../scripts/swipeable-conformance/load.cjs",
      "../../scripts/swipeable-conformance/harness.cjs",
      "../../scripts/swipeable-conformance/package-lock.json",
      "../../scripts/swipeable-conformance/node_modules/react-swipeable",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
