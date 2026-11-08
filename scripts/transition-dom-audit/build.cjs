"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  for (const [name, digest] of Object.entries(
    require("./provenance.json").fixtureFiles,
  ))
    assert.equal(
      require("node:crypto")
        .createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, name)))
        .digest("hex"),
      digest,
      name + " changed",
    );
  const out = path.join(__dirname, "node_modules/.vpm-audit");
  fs.mkdirSync(out, { recursive: true });
  const bundles = [];
  for (const variant of ["app", "current", "native"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.mjs"))};setup(${JSON.stringify(variant)});`,
    );
    const requested = new Set();
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      minify: false,
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "dom-call-audit",
          setup(build) {
            build.onResolve(
              { filter: /^dom-helpers(?:\/.*)?$/ },
              ({ path: id }) => {
                assert.match(id, /^dom-helpers\/(addClass|removeClass)$/);
                requested.add(id);
                return { path: id.split("/")[1], namespace: "dom-audit" };
              },
            );
            build.onLoad(
              { filter: /.*/, namespace: "dom-audit" },
              ({ path: name }) => {
                const real =
                  variant === "native"
                    ? null
                    : require.resolve(
                        (variant === "app"
                          ? "dom-helpers-app"
                          : "dom-helpers") +
                          "/" +
                          name,
                      );
                return {
                  loader: "js",
                  contents: `${real ? "import original from " + JSON.stringify(real) + ";" : ""}
export default function helper(node,token){const s=window.domAudit[${JSON.stringify(variant)}];if(s?.fail)throw Error('DOM helper probe');s?.calls.push({name:${JSON.stringify(name)},token,iframe:node.ownerDocument!==document});${real ? "return original(node,token);" : "node.classList." + (name === "addClass" ? "add" : "remove") + "(token);"}}`,
                };
              },
            );
          },
        },
      ],
    });
    if (!result.success) throw Error(result.logs.join("\n"));
    assert.deepEqual([...requested].sort(), [
      "dom-helpers/addClass",
      "dom-helpers/removeClass",
    ]);
    bundles.push(await result.outputs[0].text());
  }
  fs.writeFileSync(path.join(out, "bundle.js"), bundles.join("\n"));
  console.log(
    "Built current/app/native helper controls around unchanged MUI Collapse and DateCalendar callers.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
