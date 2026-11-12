"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/hook-form-conformance");
process.env.NODE_ENV = "production";
// Both controls share precisely the same production React peer.
const Module = require("node:module"),
  resolve = Module._resolveFilename,
  reactPath = require.resolve(path.join(fixture, "node_modules/react"));
Module._resolveFilename = function (name, ...args) {
  return name === "react" ? reactPath : resolve.call(this, name, ...args);
};
const React = require(reactPath),
  { renderToString } = require(
    path.join(fixture, "node_modules/react-dom/server"),
  );
const defaults = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => ["field" + i, "Value " + i]),
);
const cases = [
  ...[0, 20].map((count) => ({
    name: `SSR form with ${count} controlled inputs`,
    make(file) {
      const api = require(file);
      function Form() {
        const f = api.useForm({ defaultValues: defaults });
        return React.createElement(
          "form",
          null,
          ...Array.from({ length: count }, (_, i) =>
            React.createElement(api.Controller, {
              key: i,
              name: "field" + i,
              control: f.control,
              render: ({ field }) => React.createElement("input", field),
            }),
          ),
        );
      }
      return () => renderToString(React.createElement(Form));
    },
    validate(value) {
      assert.equal((value.match(/<input/g) || []).length, count);
      if (count) assert.match(value, /value="Value 19"/);
    },
  })),
  {
    name: "create, register, update and read twenty fields",
    make(file) {
      const api = require(file);
      return () => {
        const f = api.createFormControl({ defaultValues: defaults });
        for (const name of Object.keys(defaults)) f.register(name);
        const stop = f.subscribe({
          formState: { values: true },
          callback() {},
        });
        f.setValue("field10", "Changed", { shouldDirty: true });
        const value = f.getValues("field10");
        stop();
        return value;
      };
    },
    validate(value) {
      assert.equal(value, "Changed");
    },
  },
  {
    name: "validate and submit twenty fields through Zod",
    async: true,
    make(file) {
      const api = require(file),
        { z } = require(path.join(fixture, "node_modules/zod")),
        { zodResolver } = require(
          path.join(fixture, "node_modules/@hookform/resolvers/zod"),
        );
      const schema = z.object(
          Object.fromEntries(
            Object.keys(defaults).map((n) => [n, z.string().min(1)]),
          ),
        ),
        resolver = zodResolver(schema);
      const f = api.createFormControl({ defaultValues: defaults, resolver });
      for (const name of Object.keys(defaults)) f.register(name);
      return async () => {
        let value;
        await f.handleSubmit((v) => {
          value = v.field10;
        })();
        return value;
      };
    },
    validate(value) {
      assert.equal(value, "Value 10");
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
      "bench/run.cjs",
      "../../scripts/hook-form-conformance/package-lock.json",
      "../../scripts/hook-form-conformance/node_modules/react-hook-form",
      "../../scripts/hook-form-conformance/node_modules/react",
      "../../scripts/hook-form-conformance/node_modules/react-dom",
      "../../scripts/hook-form-conformance/node_modules/@hookform/resolvers",
      "../../scripts/hook-form-conformance/node_modules/zod",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
