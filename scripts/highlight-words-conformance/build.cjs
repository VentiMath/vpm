"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-highlight");
  fs.mkdirSync(out, { recursive: true });
  for (const [file, hash] of Object.entries(require("./upstream/hashes.json")))
    if (
      createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
        .digest("hex") !== hash
    )
      throw Error("Upstream test changed: " + file);
  const tests = fs
    .readFileSync(path.join(__dirname, "upstream/index.test.ts"), "utf8")
    .replace(/^import .*?;\n/gm, "");
  fs.writeFileSync(
    path.join(out, "tests.cjs"),
    new Bun.Transpiler({ loader: "ts", target: "node" }).transformSync(tests),
  );
  const caller = path.join(
    __dirname,
    "node_modules/material-react-table/src/components/body/MRT_TableBodyCellValue.tsx",
  );
  const expected = require("../../packages/vhighlight-words/PROVENANCE.json")
    .caller.sha256;
  if (
    createHash("sha256").update(fs.readFileSync(caller)).digest("hex") !==
    expected
  )
    throw Error("Caller changed");
  const node = await Bun.build({
    entrypoints: [caller],
    target: "node",
    jsx: { development: false },
    format: "cjs",
    external: ["react", "react/*", "@mui/*", "highlight-words"],
  });
  if (!node.success) throw Error(node.logs.join("\n"));
  fs.writeFileSync(path.join(out, "caller.cjs"), await node.outputs[0].text());
  const bundles = [];
  for (const variant of ["upstream", "vpm"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))};setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      plugins: [
        {
          name: "highlight",
          setup(build) {
            build.onResolve({ filter: /^fixture-caller$/ }, () => ({
              path: caller,
            }));
            build.onResolve({ filter: /^highlight-words$/ }, () => ({
              path:
                variant === "upstream"
                  ? require.resolve("highlight-words")
                  : path.join(
                      process.env.VPM_HIGHLIGHT_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vhighlight-words",
                        ),
                      "index.mjs",
                    ),
            }));
          },
        },
      ],
    });
    if (!result.success) throw Error(result.logs.join("\n"));
    bundles.push(await result.outputs[0].text());
  }
  fs.writeFileSync(
    path.join(out, "bundle.js"),
    bundles.join("\n") +
      "\nwindow.runChecks=()=>Boolean(window.highlightControls?.upstream&&window.highlightControls?.vpm);",
  );
  console.log("Pinned upstream tests and unchanged MRT cell caller compiled.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
