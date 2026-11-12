"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/hook-form-conformance");
process.env.NODE_ENV = "production";
const { JSDOM } = require(path.join(fixture, "node_modules/jsdom")),
  dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const key of ["window", "document", "HTMLElement", "Element", "Node"])
  globalThis[key] =
    key === "window"
      ? dom.window
      : key === "document"
        ? dom.window.document
        : dom.window[key];
const Module = require("node:module"),
  resolve = Module._resolveFilename,
  reactPath = require.resolve(path.join(fixture, "node_modules/react"));
Module._resolveFilename = function (name, ...args) {
  return name === "react" ? reactPath : resolve.call(this, name, ...args);
};
const React = require(reactPath),
  { createRoot } = require(path.join(fixture, "node_modules/react-dom/client")),
  { flushSync } = require(path.join(fixture, "node_modules/react-dom"));
const roots = [];
const cases = [
  {
    name: "update one input in a mounted twenty-field form",
    make(file) {
      const api = require(file),
        host = document.createElement("div");
      document.body.append(host);
      const root = createRoot(host);
      roots.push(root);
      let f,
        serial = 0;
      const defaults = Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => ["field" + i, "Value " + i]),
      );
      function Form() {
        f = api.useForm({ defaultValues: defaults });
        return React.createElement(
          "form",
          { "data-dirty": f.formState.isDirty },
          ...Object.keys(defaults).map((name) =>
            React.createElement(api.Controller, {
              key: name,
              name,
              control: f.control,
              render: ({ field }) => React.createElement("input", field),
            }),
          ),
        );
      }
      flushSync(() => root.render(React.createElement(Form)));
      const input = host.querySelector('[name="field10"]');
      return () => {
        const value = "Changed " + ++serial;
        flushSync(() => f.setValue("field10", value, { shouldDirty: true }));
        return input.value === value;
      };
    },
    validate(value) {
      assert.equal(value, true);
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixture, "node_modules/react-hook-form"),
    ),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "store.cjs",
      "paths.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/updates.cjs",
      "../../scripts/hook-form-conformance/package-lock.json",
      "../../scripts/hook-form-conformance/node_modules/react-hook-form",
      "../../scripts/hook-form-conformance/node_modules/react",
      "../../scripts/hook-form-conformance/node_modules/react-dom",
      "../../scripts/hook-form-conformance/node_modules/jsdom",
    ],
    cleanup() {
      for (const root of roots) flushSync(() => root.unmount());
      dom.window.close();
    },
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
