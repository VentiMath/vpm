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
  const out = path.join(__dirname, "node_modules/.vpm-match");
  fs.mkdirSync(out, { recursive: true });
  const source = path.join(out, "filterFns.ts");
  fs.copyFileSync(
    path.join(__dirname, "upstream/MRT-filterFns.ts.txt"),
    source,
  );
  const result = await Bun.build({
    entrypoints: [source],
    target: "node",
    format: "cjs",
    external: ["@tanstack/match-sorter-utils", "@tanstack/react-table"],
  });
  assert.ok(result.success, result.logs.join("\n"));
  fs.writeFileSync(
    path.join(out, "caller.cjs"),
    await result.outputs[0].text(),
  );
  console.log("Unchanged, hash-checked MRT fuzzy-filter caller compiled.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
