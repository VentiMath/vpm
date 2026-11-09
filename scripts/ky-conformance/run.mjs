import assert from "node:assert/strict";
import fs from "node:fs";
import { scenarios } from "./cases.mjs";
import * as upstream from "ky";
import * as old from "ky-app";
import * as vpm from "../../packages/vky/index.mjs";
import * as legacy from "../../packages/vky/legacy.mjs";
const results = {};
for (const [name, a, b, isLegacy] of [
  ["current", upstream, vpm, false],
  ["application", old, legacy, true],
]) {
  results[name] = {
    upstream: await scenarios(a, isLegacy),
    vpm: await scenarios(b, isLegacy),
  };
  fs.writeFileSync(
    new URL(
      "./node_modules/results-" +
        (process.versions.bun ? "bun" : "node") +
        ".json",
      import.meta.url,
    ),
    JSON.stringify(results, null, 2),
  );
  assert.deepEqual(
    results[name].vpm,
    results[name].upstream,
    name + " public behavior",
  );
  console.log(
    name +
      ": " +
      Object.keys(results[name].vpm).length +
      " exact public-API scenarios match.",
  );
}
