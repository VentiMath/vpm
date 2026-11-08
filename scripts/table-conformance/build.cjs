"use strict";
require("./check-controls.cjs").check();
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-table");
  fs.mkdirSync(out, { recursive: true });
  const parts = [];
  for (const variant of ["app", "vpm"]) {
    const file = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      file,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.mjs"))};setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [file],
      target: "browser",
      format: "iife",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "table-control",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/table-core$/ }, () => ({
              path:
                variant === "app"
                  ? require.resolve("table-app")
                  : path.join(
                      process.env.VPM_TABLE_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vtanstack-table-core",
                        ),
                      "index.cjs",
                    ),
            }));
            b.onResolve(
              { filter: /^@tanstack\/table-core\/store-reactivity-bindings$/ },
              () => ({
                path: require.resolve(
                  "@tanstack/table-core/store-reactivity-bindings",
                ),
              }),
            );
          },
        },
      ],
    });
    assert.ok(result.success, result.logs.join("\n"));
    parts.push(await result.outputs[0].text());
  }
  fs.writeFileSync(path.join(out, "table.js"), parts.join("\n"));
  console.log(
    "Built unchanged MRT3.2.1/ReactTable8 callers with app core and VPM.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
