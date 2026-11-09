"use strict";
const path = require("node:path"),
  fs = require("node:fs");
(async () => {
  const outdir = path.join(__dirname, "node_modules/.vpm-motion-dom");
  fs.mkdirSync(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [path.join(__dirname, "browser-entry.mjs")],
    outdir,
    naming: "browser.js",
    target: "browser",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  });
  if (!result.success)
    throw new AggregateError(result.logs, "Browser build failed");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
