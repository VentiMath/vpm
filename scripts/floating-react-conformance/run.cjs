"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  modules = path.join(__dirname, "node_modules"),
  source = path.join(__dirname, "upstream");
for (const [file, hash] of Object.entries(
  require("./upstream/provenance.json").sha256,
))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(source, file)))
      .digest("hex"),
    hash,
    file,
  );
for (const variant of process.argv.includes("--vpm")
  ? ["vpm"]
  : ["upstream", "vpm"]) {
  const temp = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpm-react-interactions-")),
  );
  try {
    fs.symlinkSync(modules, path.join(temp, "node_modules"), "dir");
    const api =
      variant === "vpm"
        ? path.join(root, "packages/vfloating-ui-react/runtime.mjs")
        : path.join(modules, "@floating-ui/react/dist/floating-ui.react.mjs");
    const alias = {
      subject: api,
      react: path.join(modules, "react"),
      "react-dom": path.join(modules, "react-dom"),
    };
    fs.writeFileSync(
      path.join(temp, "vitest.config.mjs"),
      `export default {resolve:{alias:${JSON.stringify(alias)},dedupe:['react','react-dom']},esbuild:{jsx:'automatic'},test:{globals:true,environment:'jsdom',setupFiles:['./setup.ts'],include:['*.test.tsx']}};`,
    );
    fs.copyFileSync(
      path.join(source, "setupTests.ts.txt"),
      path.join(temp, "setup.ts"),
    );
    for (const name of [
      "useMergeRefs",
      "useClick",
      "useRole",
      "FloatingList",
      "FloatingDelayGroup",
    ])
      fs.writeFileSync(
        path.join(temp, name + ".test.tsx"),
        fs
          .readFileSync(path.join(source, name + ".test.tsx.txt"), "utf8")
          .replace(
            /from ['"]\.\.\/\.\.\/src(?:\/[^'"]*)?['"]/g,
            "from 'subject'",
          ),
      );
    if (fs.existsSync(path.join(__dirname, "scenarios.tsx.txt")))
      fs.copyFileSync(
        path.join(__dirname, "scenarios.tsx.txt"),
        path.join(temp, "scenarios.test.tsx"),
      );
    const report = path.join(temp, "report.json"),
      r = spawnSync(
        process.execPath,
        [
          path.join(modules, "vitest/vitest.mjs"),
          "run",
          "--root",
          temp,
          "--config",
          path.join(temp, "vitest.config.mjs"),
          "--reporter=json",
          "--outputFile=" + report,
        ],
        {
          encoding: "utf8",
          timeout: 60000,
          env: {
            ...process.env,
            VPM_ORIGINAL: variant === "upstream" ? "1" : "0",
          },
        },
      );
    if (!fs.existsSync(report)) throw Error(r.stdout + r.stderr);
    const data = JSON.parse(fs.readFileSync(report));
    console.log(
      variant + ": " + data.numPassedTests + "/" + data.numTotalTests + " pass",
    );
    if (r.status !== 0) {
      for (const suite of data.testResults)
        for (const test of suite.assertionResults || [])
          if (test.status === "failed")
            console.error(
              test.fullName + "\n" + test.failureMessages.join("\n"),
            );
      throw Error(
        "Conformance failed: " + variant + "\n" + r.stderr.slice(-2500),
      );
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
