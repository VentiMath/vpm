"use strict";
require("../react-table-conformance/check-controls.cjs").check();
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const fixture = path.resolve(__dirname, "../react-table-conformance"),
  control = createRequire(path.join(fixture, "package.json")),
  out = path.join(fixture, "node_modules/.vpm-material-table");
const peer = process.env.VPM_MATERIAL_CONSUMER
  ? createRequire(path.join(process.env.VPM_MATERIAL_CONSUMER, "package.json"))
  : control;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const parts = [];
  for (const variant of ["app", "vpm"]) {
    const source = path.join(out, "entry-" + variant + ".mjs");
    fs.writeFileSync(
      source,
      `import setup from ${JSON.stringify(path.join(fixture, "caller-regressions.mjs"))};import ui from ${JSON.stringify(path.join(__dirname, "interactions.mjs"))};setup(${JSON.stringify(variant)});ui(${JSON.stringify(variant)});`,
    );
    const entry =
      variant === "vpm"
        ? process.env.VPM_MATERIAL_ENTRY ||
          path.resolve(
            __dirname,
            "../../packages/vmaterial-react-table/index.cjs",
          )
        : control.resolve("material-react-table");
    let serverBuild = false;
    const plugins = [
      {
        name: "pinned-peers",
        setup(b) {
          b.onResolve({ filter: /^material-react-table$/ }, () => ({
            path: entry,
          }));
          b.onResolve(
            {
              filter:
                /^(react(?:\/.*)?|react-dom(?:\/.*)?|@mui\/.*|@emotion\/.*)$/,
            },
            ({ path: id }) =>
              serverBuild
                ? { path: id, external: true }
                : { path: peer.resolve(id) },
          );
          b.onResolve({ filter: /^@tanstack\/react-table$/ }, () => ({
            path: control.resolve("react-table-app"),
          }));
          b.onResolve({ filter: /^@tanstack\/table-core$/ }, () => ({
            path: control.resolve("table-app"),
          }));
        },
      },
    ];
    const result = await Bun.build({
      entrypoints: [source],
      format: "iife",
      target: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins,
    });
    assert.ok(result.success, result.logs.join("\n"));
    parts.push(await result.outputs[0].text());
    serverBuild = true;
    const server = await Bun.build({
      entrypoints: [entry],
      format: "cjs",
      target: "node",
      external: ["react", "react-dom", "react-dom/*", "@mui/*", "@emotion/*"],
      plugins,
    });
    assert.ok(server.success, server.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, "ssr-" + variant + ".cjs"),
      await server.outputs[0].text(),
    );
  }
  fs.writeFileSync(path.join(out, "browser.js"), parts.join("\n"));
  console.log("Built MRT3.2.1 and independent widget against identical peers.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
