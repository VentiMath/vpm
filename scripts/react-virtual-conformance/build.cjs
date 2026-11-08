"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto"),
  { createRequire } = require("node:module");
(async () => {
  const base = path.resolve(__dirname, "../virtual-core-conformance");
  for (const directory of [__dirname, base])
    for (const [file, hash] of Object.entries(
      require(path.join(directory, "provenance.json")).fixtureFiles,
    ))
      assert.equal(
        createHash("sha256")
          .update(fs.readFileSync(path.join(directory, file)))
          .digest("hex"),
        hash,
        file,
      );
  const out = path.join(__dirname, "node_modules/.vpm-react-virtual"),
    callers = path.join(base, "node_modules/.vpm-virtual");
  fs.mkdirSync(out, { recursive: true });
  for (const relative of [
    "src/hooks/useMRT_RowVirtualizer.ts",
    "src/hooks/useMRT_ColumnVirtualizer.ts",
    "src/utils/virtualization.utils.ts",
    "src/utils/utils.ts",
  ]) {
    const dest = path.join(callers, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(base, "upstream", relative + ".txt"), dest);
  }
  const peer = process.env.VPM_REACT_CONSUMER
    ? createRequire(path.join(process.env.VPM_REACT_CONSUMER, "package.json"))
    : require;
  const core =
    process.env.VPM_VIRTUAL_ENTRY ||
    path.resolve(__dirname, "../../packages/vtanstack-virtual-core");
  const candidate =
    process.env.VPM_REACT_VIRTUAL_ENTRY ||
    path.resolve(__dirname, "../../packages/vtanstack-react-virtual");
  for (const kind of ["table", "lifecycle"]) {
    const parts = [];
    for (const variant of kind === "table"
      ? ["current", "app", "vpm"]
      : ["current", "vpm"]) {
      const file = path.join(out, kind + "-" + variant + ".mjs");
      fs.writeFileSync(
        file,
        `import setup from ${JSON.stringify(kind === "table" ? path.join(base, "browser-entry.mjs") : path.join(__dirname, "lifecycle.mjs"))};setup(${JSON.stringify(variant)});`,
      );
      const control = require.resolve(
          variant === "app" ? "react-virtual-app" : "@tanstack/react-virtual",
        ),
        fromControl = createRequire(control);
      const result = await Bun.build({
        entrypoints: [file],
        target: "browser",
        format: "iife",
        define: {
          "process.env.NODE_ENV": JSON.stringify(
            kind === "table" ? "production" : "development",
          ),
        },
        plugins: [
          {
            name: "adapter-controls",
            setup(build) {
              build.onResolve(
                { filter: /^(react|react-dom(?:\/.*)?)$/ },
                ({ path: id }) => ({ path: peer.resolve(id) }),
              );
              build.onResolve({ filter: /^@tanstack\/react-virtual$/ }, () => ({
                path:
                  variant === "vpm"
                    ? path.join(candidate, "index.cjs")
                    : control,
              }));
              build.onResolve(
                {
                  filter:
                    /^(?:@tanstack\/virtual-core|vtanstack-virtual-core)$/,
                },
                () => ({
                  path:
                    variant === "vpm" || kind === "lifecycle"
                      ? path.join(core, "index.cjs")
                      : fromControl.resolve("@tanstack/virtual-core"),
                }),
              );
            },
          },
        ],
      });
      assert.ok(result.success, result.logs.join("\n"));
      parts.push(await result.outputs[0].text());
    }
    fs.writeFileSync(path.join(out, kind + ".js"), parts.join("\n"));
  }
  console.log(
    "Built unchanged MRT controls and development React adapter lifecycle cases.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
