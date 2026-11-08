"use strict";
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), { createHash } = require("node:crypto"), { spawnSync } = require("node:child_process");
const directory = path.resolve(process.argv[2] || "."), published = process.argv.includes("--published");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "release-manifest.json")));
  assert.equal(manifest.packages.length, 1);
  const item = manifest.packages[0];
  assert.equal(item.name, "vreact-transition-group"); assert.equal(item.version, "4.4.5"); assert.deepEqual(item.dependencies, {});
  assert.equal(item.url, `https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${item.asset}`);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,"consumer-package.json"))), { dependencies: { "react-transition-group": item.url }, overrides: { "react-transition-group": item.url } });
  for (const line of fs.readFileSync(path.join(directory,"SHA256SUMS"),"utf8").trim().split("\n")) {
    const [digest,file] = line.split("  "); assert.equal(path.basename(file), file); assert.equal(hash(fs.readFileSync(path.join(directory,file))), digest);
  }
  assert.equal(hash(fs.readFileSync(path.join(directory,item.asset))), item.sha256);
  if (published) for (const file of [item.asset,"release-manifest.json","consumer-package.json","SHA256SUMS"]) {
    const response = await fetch(`https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${file}`);
    assert.ok(response.ok, file + ": " + response.status);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(directory,file)));
  }
  const result = spawnSync(process.execPath,[path.join(__dirname,"transition-group-conformance/archives.cjs")],{stdio:"inherit",env:{...process.env,VPM_TRANSITION_ARCHIVE:path.join(directory,item.asset),...(published?{VPM_TRANSITION_URL:item.url}:{})}});
  assert.ifError(result.error); assert.equal(result.status,0);
  console.log((published ? "Public URL bytes and " : "") + "exact transition release pass alias/override installs and full packed caller checks.");
})().catch(error => { console.error(error); process.exitCode=1; });
