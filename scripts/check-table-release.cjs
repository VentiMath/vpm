"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const directory = path.resolve(process.argv[2] || "."),
  published = process.argv.includes("--published");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
(async () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "release-manifest.json")),
  );
  assert.deepEqual(manifest.packages.map((p) => p.name).sort(), [
    "vtanstack-react-table",
    "vtanstack-store",
    "vtanstack-table-core",
  ]);
  const top = manifest.packages.find((p) => p.name === "vtanstack-react-table");
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(directory, "consumer-package.json"))),
    {
      dependencies: { "@tanstack/react-table": top.url },
      overrides: { "@tanstack/react-table": top.url },
    },
  );
  for (const p of manifest.packages) {
    assert.equal(
      p.url,
      `https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${p.asset}`,
    );
    assert.equal(
      hash(fs.readFileSync(path.join(directory, p.asset))),
      p.sha256,
    );
    for (const [name, url] of Object.entries(p.dependencies))
      assert.equal(url, manifest.packages.find((p) => p.name === name)?.url);
  }
  for (const line of fs
    .readFileSync(path.join(directory, "SHA256SUMS"), "utf8")
    .trim()
    .split("\n")) {
    const [digest, file] = line.split("  ");
    assert.equal(path.basename(file), file);
    assert.equal(hash(fs.readFileSync(path.join(directory, file))), digest);
  }
  if (published)
    for (const file of [
      ...manifest.packages.map((p) => p.asset),
      "release-manifest.json",
      "consumer-package.json",
      "SHA256SUMS",
    ]) {
      const r = await fetch(
        `https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${file}`,
      );
      assert.ok(r.ok, file + ": " + r.status);
      assert.deepEqual(
        Buffer.from(await r.arrayBuffer()),
        fs.readFileSync(path.join(directory, file)),
      );
    }
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, "react-table-conformance/archives.cjs")],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        VPM_TABLE_RELEASE_DIR: directory,
        VPM_TABLE_RELEASE_PUBLISHED: published ? "1" : "0",
      },
    },
  );
  assert.ifError(r.error);
  assert.equal(r.status, 0);
  console.log(
    (published ? "Public root URL and " : "Local ") +
      "Table release: exact closure, frozen installs, React19.3.1, Node/Bun, TS7 and Chrome pass.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
