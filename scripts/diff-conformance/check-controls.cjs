"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto"),
  assert = require("node:assert/strict");
function digest(p) {
  return createHash("sha256")
    .update(
      fs.statSync(p).isDirectory()
        ? JSON.stringify(
            fs
              .readdirSync(p)
              .sort()
              .map((n) => [n, digest(path.join(p, n))]),
          )
        : fs.readFileSync(p),
    )
    .digest("hex");
}
function check() {
  for (const [file, hash] of Object.entries(
    require("./provenance.json").fixtureFiles,
  ))
    assert.equal(digest(path.join(__dirname, file)), hash, file);
}
module.exports = { digest, check };
if (require.main === module) {
  check();
  console.log("Pinned diff controls verified.");
}
