"use strict";
require("./check-controls.cjs").check();
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-react-table");
  fs.mkdirSync(out, { recursive: true });
  const peer = process.env.VPM_REACT_CONSUMER
    ? createRequire(path.join(process.env.VPM_REACT_CONSUMER, "package.json"))
    : require;
  for (const kind of ["table", "caller", "lifecycle"]) {
    const parts = [];
    for (const variant of kind !== "lifecycle"
      ? ["app", "vpm"]
      : ["current", "vpm"]) {
      const entry = path.join(out, kind + "-" + variant + ".mjs");
      fs.writeFileSync(
        entry,
        `import setup from ${JSON.stringify(path.join(__dirname, kind === "table" ? "../table-conformance/browser-entry.mjs" : kind === "caller" ? "caller-regressions.mjs" : "lifecycle.mjs"))};setup(${JSON.stringify(variant)});`,
      );
      const result = await Bun.build({
        entrypoints: [entry],
        format: "iife",
        target: "browser",
        define: {
          "process.env.NODE_ENV": JSON.stringify(
            kind !== "lifecycle" ? "production" : "development",
          ),
        },
        plugins: [
          {
            name: "adapter-controls",
            setup(b) {
              b.onResolve(
                { filter: /^(react|react-dom(?:\/.*)?)$/ },
                ({ path: id }) => ({ path: peer.resolve(id) }),
              );
              b.onResolve({ filter: /^@tanstack\/react-table$/ }, () => ({
                path:
                  variant === "vpm"
                    ? path.join(
                        process.env.VPM_REACT_TABLE_ENTRY ||
                          path.resolve(
                            __dirname,
                            "../../packages/vtanstack-react-table",
                          ),
                        "index.cjs",
                      )
                    : require.resolve(
                        variant === "app"
                          ? "react-table-app"
                          : "@tanstack/react-table",
                      ),
              }));
              b.onResolve({ filter: /^@tanstack\/table-core$/ }, () => ({
                path: require.resolve(
                  variant === "app" ? "table-app" : "@tanstack/table-core",
                ),
              }));
              b.onResolve({ filter: /^@tanstack\/store$/ }, () => ({
                path:
                  variant === "vpm"
                    ? path.join(
                        process.env.VPM_STORE_ENTRY ||
                          path.resolve(
                            __dirname,
                            "../../packages/vtanstack-store",
                          ),
                        "index.cjs",
                      )
                    : require.resolve("@tanstack/store"),
              }));
            },
          },
        ],
      });
      assert.ok(result.success, result.logs.join("\n"));
      parts.push(await result.outputs[0].text());
    }
    fs.writeFileSync(path.join(out, kind + ".js"), parts.join("\n"));
  }
  for (const variant of ["current", "app"]) {
    const entry = path.join(out, "ssr-" + variant + ".mjs");
    fs.writeFileSync(
      entry,
      variant === "current"
        ? "export * from '@tanstack/react-table'; export * from '@tanstack/react-table/legacy';"
        : "export * from 'react-table-app';",
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "node",
      format: "cjs",
      external: ["react", "react-dom", "react-dom/*"],
    });
    assert.ok(result.success, result.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, "ssr-" + variant + ".cjs"),
      await result.outputs[0].text(),
    );
  }
  console.log(
    "Built unchanged MRT adapter and current React lifecycle controls.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
