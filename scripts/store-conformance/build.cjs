"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
(async () => {
  const root = path.resolve(__dirname, "../.."),
    out = path.join(__dirname, "node_modules/.vpm-store");
  fs.mkdirSync(out, { recursive: true });
  const provenance = require("./provenance.json");
  for (const [file, hash] of Object.entries(provenance.fixtureFiles))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, file)))
        .digest("hex"),
      hash,
      file,
    );
  for (const variant of ["upstream", "vpm"]) {
    const entry =
      variant === "upstream"
        ? require.resolve("@tanstack/store")
        : path.join(
            process.env.VPM_STORE_ENTRY ||
              path.join(root, "packages/vtanstack-store"),
            "index.cjs",
          );
    const result = await Bun.build({
      entrypoints: [path.join(__dirname, "table.mjs")],
      format: "cjs",
      target: "node",
      plugins: [
        {
          name: "store-control",
          setup(b) {
            b.onResolve({ filter: /^@tanstack\/store$/ }, () => ({
              path: entry,
            }));
          },
        },
      ],
    });
    assert.ok(result.success, result.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, variant + ".cjs"),
      await result.outputs[0].text(),
    );
  }
  console.log(
    "Built unchanged Table9 caller with pinned Store control and VPM.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
