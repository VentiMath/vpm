"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
(async () => {
  for (const [file, hash] of Object.entries(
    require("./provenance.json").fixtureFiles,
  ))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, file)))
        .digest("hex"),
      hash,
      file,
    );
  const out = path.join(__dirname, "node_modules/.vpm-virtual");
  fs.mkdirSync(out, { recursive: true });
  for (const relative of [
    "src/hooks/useMRT_RowVirtualizer.ts",
    "src/hooks/useMRT_ColumnVirtualizer.ts",
    "src/utils/virtualization.utils.ts",
    "src/utils/utils.ts",
  ]) {
    const dest = path.join(out, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(__dirname, "upstream", relative + ".txt"), dest);
  }
  const parts = [];
  for (const variant of ["current", "app", "vpm"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.mjs"))};setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "core-control",
          setup(build) {
            build.onResolve({ filter: /^@tanstack\/virtual-core$/ }, () => ({
              path:
                variant === "vpm"
                  ? path.join(
                      process.env.VPM_VIRTUAL_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vtanstack-virtual-core",
                        ),
                      "index.cjs",
                    )
                  : require.resolve(
                      variant === "app"
                        ? "virtual-core-app"
                        : "@tanstack/virtual-core",
                    ),
            }));
          },
        },
      ],
    });
    assert.ok(result.success, result.logs.join("\n"));
    parts.push(await result.outputs[0].text());
  }
  fs.writeFileSync(path.join(out, "bundle.js"), parts.join("\n"));
  console.log(
    "Built unchanged MRT row/column hooks and app React adapter against current/app/VPM core.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
