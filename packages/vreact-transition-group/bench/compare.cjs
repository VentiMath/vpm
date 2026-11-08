"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/transition-group-conformance");
const from = require("node:module").createRequire(
  path.join(fixture, "package.json"),
);
const React = from("react"),
  { renderToStaticMarkup } = from("react-dom/server"),
  load = from("./load.cjs"),
  h = React.createElement;
let dom;
function environment() {
  if (!dom) {
    dom = new (from("jsdom").JSDOM)("<!doctype html><body></body>", {
      pretendToBeVisual: true,
    });
    global.window = dom.window;
    global.document = dom.window.document;
  }
  return {
    createRoot: from("react-dom/client").createRoot,
    flushSync: from("react-dom").flushSync,
  };
}
const cases = [1, 10].map((count) => ({
  name: "SSR " + count + " explicit-ref transitions",
  make(entry) {
    const api = load(entry),
      child = h(
        api.TransitionGroup,
        { component: null },
        Array.from({ length: count }, (_, key) =>
          h(
            api.Transition,
            { key, nodeRef: React.createRef(), in: true, timeout: 0 },
            (phase) => h("span", null, phase),
          ),
        ),
      );
    return () => renderToStaticMarkup(child);
  },
  validate(value) {
    assert.equal((value.match(/entered/g) || []).length, count);
  },
}));
cases.push({
  name: "DOM disabled transition open-close cycle (jsdom)",
  make(entry) {
    const api = load(entry),
      { createRoot, flushSync } = environment(),
      host = document.createElement("div"),
      ref = React.createRef();
    document.body.append(host);
    const root = createRoot(host);
    api.config.disabled = true;
    const draw = (value) =>
      flushSync(() =>
        root.render(
          h(api.Transition, { in: value, nodeRef: ref, timeout: 0 }, (phase) =>
            h("span", { ref }, phase),
          ),
        ),
      );
    draw(false);
    return () => {
      draw(true);
      draw(false);
      return host.textContent;
    };
  },
  validate(value) {
    assert.equal(value, "exited");
  },
});
cases.push({
  name: "DOM CSS transition open-close cycle (jsdom)",
  make(entry) {
    const api = load(entry),
      { createRoot, flushSync } = environment(),
      host = document.createElement("div"),
      ref = React.createRef();
    document.body.append(host);
    const root = createRoot(host);
    api.config.disabled = false;
    const draw = (value) =>
      flushSync(() =>
        root.render(
          h(
            api.CSSTransition,
            {
              in: value,
              nodeRef: ref,
              timeout: null,
              addEndListener: (done) => done(),
              classNames: "fade",
            },
            h("span", { ref }),
          ),
        ),
      );
    draw(false);
    return () => {
      draw(true);
      draw(false);
      return ref.current.className;
    };
  },
  validate(value) {
    assert.equal(value, "fade-exit-done");
  },
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/react-transition-group"),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/transition-group-conformance/load.cjs",
      "../../scripts/transition-group-conformance/package-lock.json",
      "../../scripts/transition-group-conformance/node_modules/react-transition-group/cjs",
    ],
    cleanup: () => {
      dom?.window.close();
    },
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
