"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/sidecar-conformance");
const R = require("node:module").createRequire(
  path.join(fixture, "package.json"),
);
const React = R("react"),
  { JSDOM } = R("jsdom"),
  dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "navigator", "HTMLElement", "Node"])
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
  });
const { createRoot } = R("react-dom/client"),
  { flushSync } = R("react-dom"),
  roots = [];
const cases = [
  {
    name: "create sidecar medium",
    make: (file) => {
      const api = require(file);
      return () => api.createSidecarMedium();
    },
    validate: (v) => assert.equal(v.read(), null),
  },
  {
    name: "register and cancel with 64 live values",
    make: (file) => {
      const api = require(file),
        m = api.createMedium();
      for (let i = 0; i < 64; i++) m.useMedium(i);
      return () => {
        m.useMedium(64)();
        return m.read();
      };
    },
    validate: (v) => assert.equal(v, 63),
  },
  {
    name: "synchronous medium dispatch",
    make: (file) => {
      const api = require(file),
        m = api.createMedium();
      let seen;
      m.assignSyncMedium((value) => (seen = value));
      return () => {
        m.useMedium(7);
        return seen;
      };
    },
    validate: (v) => assert.equal(v, 7),
  },
  {
    name: "asynchronous batch of 64 values",
    async: true,
    make: (file) => {
      const api = require(file),
        m = api.createMedium();
      let sum = 0;
      m.assignMedium((value) => (sum += value));
      return async () => {
        sum = 0;
        for (let i = 0; i < 64; i++) m.useMedium(1);
        await Promise.resolve();
        return sum;
      };
    },
    validate: (v) => assert.equal(v, 64),
  },
  {
    name: "mounted renderCar update",
    make: (file) => {
      const api = require(file),
        host = document.createElement("div"),
        root = createRoot(host);
      roots.push(root);
      let x = 0;
      const child = (value) => React.createElement("span", null, value);
      function Source({ x, children }) {
        return children(x);
      }
      const Bridge = api.renderCar(Source, (props) => [props.x]);
      return () => {
        x = (x + 1) % 10;
        flushSync(() => root.render(React.createElement(Bridge, { x }, child)));
        return [host.textContent, x];
      };
    },
    validate: (v) => assert.equal(v[0], String(v[1])),
  },
];
const harness = require("../../../scripts/bench-process.cjs"),
  options = {
    root,
    upstream: path.join(fixture, "node_modules/use-sidecar"),
    vpm: root,
    files: [
      "package.json",
      "index.cjs",
      "medium.cjs",
      "env.cjs",
      "bench/compare.cjs",
      "../../scripts/sidecar-conformance/package-lock.json",
      ...["use-sidecar", "react", "react-dom"].map(
        (n) => "../../scripts/sidecar-conformance/node_modules/" + n,
      ),
    ],
    cleanup: async () => {
      for (const root of roots) flushSync(() => root.unmount());
      dom.window.close();
    },
  };
(async () => {
  if (process.env.VPM_BENCH_WORKER) {
    const i = Number(process.env.VPM_CASE);
    assert.ok(Number.isInteger(i) && cases[i]);
    await harness.run({ ...options, cases: [cases[i]] });
    return;
  }
  const dir = process.env.RESULT_DIR || path.join(__dirname, "results");
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < cases.length; i++) {
    process.env.VPM_CASE = String(i);
    process.env.OUTPUT = path.join(
      dir,
      `${process.versions.bun ? "bun" : "node"}-${i}.json`,
    );
    await harness.run({ ...options, cases: [cases[i]] });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
