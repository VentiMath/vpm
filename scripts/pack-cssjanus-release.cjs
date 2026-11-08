"use strict";
// Pack a committed CSSJanus snapshot. Only dependency locations are rewritten;
// runtime, declarations, CSS, license and provenance bytes must match the commit.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { execFileSync } = require("node:child_process"),
  { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function build({ ref, tag, out }) {
  assert.match(tag, /^cssjanus-\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/);
  assert.ok(out, "An output directory is required");
  out = path.resolve(out);
  fs.mkdirSync(out, { recursive: true });
  assert.equal(
    fs.readdirSync(out).length,
    0,
    "Output must be empty; existing release assets are never overwritten",
  );
  const commit = execFileSync(
    "git",
    ["rev-parse", "--verify", ref + "^{commit}"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const names = [],
    seen = new Set();
  function visit(name) {
    if (seen.has(name)) return;
    seen.add(name);
    const metadata = JSON.parse(
      execFileSync(
        "git",
        ["show", commit + ":packages/" + name + "/package.json"],
        { cwd: root, encoding: "utf8" },
      ),
    );
    assert.equal(metadata.name, name);
    for (const child of Object.keys({
      ...metadata.dependencies,
      ...metadata.optionalDependencies,
    }))
      visit(child);
    names.push(name);
  }
  visit("vcssjanus");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-cssjanus-release-"));
  try {
    fs.writeFileSync(
      path.join(temp, "source.tar"),
      execFileSync(
        "git",
        [
          "archive",
          "--format=tar",
          commit,
          "--",
          ...names.map((n) => "packages/" + n),
        ],
        { cwd: root, maxBuffer: 32 * 1024 * 1024 },
      ),
    );
    execFileSync("tar", ["-xf", path.join(temp, "source.tar"), "-C", temp]);
    const base = "https://github.com/VentiMath/vpm/releases/download/" + tag;
    const metadata = Object.fromEntries(
      names.map((name) => [
        name,
        JSON.parse(
          fs.readFileSync(path.join(temp, "packages", name, "package.json")),
        ),
      ]),
    );
    const assets = Object.fromEntries(
      names.map((name) => [name, name + "-" + metadata[name].version + ".tgz"]),
    );
    const manifest = {
      schemaVersion: 1,
      repository: "https://github.com/VentiMath/vpm",
      sourceCommit: commit,
      tag,
      packingTool: execFileSync("bun", ["--version"], {
        encoding: "utf8",
      }).trim(),
      packages: [],
    };
    for (const name of names) {
      const dir = path.join(temp, "packages", name),
        original = metadata[name],
        published = structuredClone(original);
      const provenance = JSON.parse(
        fs.readFileSync(path.join(dir, "PROVENANCE.json")),
      );
      assert.equal(
        original.version,
        provenance.upstream.version,
        name + ": package version must match the upstream baseline",
      );
      for (const field of ["dependencies", "optionalDependencies"])
        for (const dependency of Object.keys(published[field] || {})) {
          assert.ok(
            assets[dependency],
            name + ": dependency is missing from this release: " + dependency,
          );
          published[field][dependency] = base + "/" + assets[dependency];
        }
      fs.writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify(published, null, 2) + "\n",
      );
      execFileSync(
        "bun",
        ["pm", "pack", "--ignore-scripts", "--destination", out, "--quiet"],
        { cwd: dir, stdio: ["ignore", "pipe", "pipe"] },
      );
      const archive = path.join(out, assets[name]);
      const unpack = path.join(temp, "unpack-" + name);
      fs.mkdirSync(unpack);
      const entries = execFileSync("tar", ["-tzf", archive], {
        encoding: "utf8",
      })
        .trim()
        .split("\n");
      for (const entry of entries) {
        assert.match(entry, /^package\//);
        assert.ok(!entry.split("/").includes(".."));
        assert.doesNotMatch(entry, /^package\/(?:test|bench|node_modules)\//);
      }
      execFileSync("tar", ["-xzf", archive, "-C", unpack]);
      const sourceFiles = {};
      for (const entry of entries.filter((p) => !p.endsWith("/"))) {
        const packed = path.join(unpack, entry),
          relative = entry.slice(8);
        assert.ok(
          fs.lstatSync(packed).isFile(),
          "Only regular package files may ship",
        );
        if (relative === "package.json")
          assert.deepEqual(JSON.parse(fs.readFileSync(packed)), published);
        else {
          const bytes = fs.readFileSync(packed);
          assert.deepEqual(
            bytes,
            fs.readFileSync(path.join(dir, relative)),
            name + "/" + relative,
          );
          sourceFiles[relative] = hash(bytes);
        }
      }
      for (const required of [
        "package.json",
        "LICENSE",
        "PROVENANCE.json",
        "README.md",
      ])
        assert.ok(
          entries.includes("package/" + required),
          name + ": " + required,
        );
      manifest.packages.push({
        name,
        version: published.version,
        asset: assets[name],
        url: base + "/" + assets[name],
        sha256: hash(fs.readFileSync(archive)),
        dependencies: published.dependencies || {},
        sourceFiles,
      });
    }
    const aliases = {
      cssjanus: "vcssjanus",
    };
    manifest.installNames = Object.fromEntries(
      manifest.packages.map((p) => [
        p.name,
        Object.keys(aliases).find((k) => aliases[k] === p.name) || p.name,
      ]),
    );
    fs.writeFileSync(
      path.join(out, "consumer-package.json"),
      JSON.stringify(
        {
          overrides: Object.fromEntries(
            Object.entries(aliases).map(([name, pkg]) => [
              name,
              manifest.packages.find((p) => p.name === pkg).url,
            ]),
          ),
        },
        null,
        2,
      ) + "\n",
    );
    fs.writeFileSync(
      path.join(out, "release-manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    const checksums = [
      ...manifest.packages.map((p) => [p.asset, p.sha256]),
      ...["release-manifest.json", "consumer-package.json"].map((file) => [
        file,
        hash(fs.readFileSync(path.join(out, file))),
      ]),
    ];
    fs.writeFileSync(
      path.join(out, "SHA256SUMS"),
      checksums.map(([file, digest]) => digest + "  " + file).join("\n") + "\n",
    );
    console.log(
      JSON.stringify(
        {
          sourceCommit: commit,
          tag,
          packages: manifest.packages.map(({ name, version, url }) => ({
            name,
            version,
            url,
          })),
        },
        null,
        2,
      ),
    );
    return manifest;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
module.exports = { build };
if (require.main === module) {
  const args = process.argv.slice(2);
  const take = (name) => args[args.indexOf(name) + 1];
  assert.ok(
    args.includes("--ref") && args.includes("--tag") && args.includes("--out"),
    "Usage: node scripts/pack-cssjanus-release.cjs --ref COMMIT --tag cssjanus-VERSION --out EMPTY_DIRECTORY",
  );
  build({ ref: take("--ref"), tag: take("--tag"), out: take("--out") });
}
