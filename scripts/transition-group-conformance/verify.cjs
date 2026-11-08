"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
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
