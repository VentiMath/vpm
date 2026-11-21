import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  TraceMap,
  originalPositionFor,
  decodedMappings,
} from "@jridgewell/trace-mapping";
import {
  GenMapping,
  addMapping,
  toEncodedMap,
  setSourceContent,
  allMappings,
  setIgnore,
  fromMap,
} from "@jridgewell/gen-mapping";
import remap from "@jridgewell/remapping";
const require = createRequire(import.meta.url);
const { generate } = require("@babel/generator"),
  { parse } = require("@babel/parser");
const original = "const answer = n + 1;";
const input = "const value = n + 1;";
const first = new GenMapping({ file: "prepared.js" });
setSourceContent(first, "contest.ts", original);
setIgnore(first, "contest.ts", true);
for (const [col, name] of [
  [0, null],
  [6, "answer"],
  [14, "n"],
])
  addMapping(first, {
    source: "contest.ts",
    original: { line: 1, column: col },
    generated: { line: 1, column: col },
    name,
  });
const sourceMap = toEncodedMap(first);
assert.deepEqual(toEncodedMap(fromMap(sourceMap)), sourceMap);
const ast = parse(input, { sourceFilename: "prepared.js" });
const make = (extra) =>
  generate(
    ast,
    {
      sourceMaps: true,
      compact: true,
      sourceFileName: "prepared.js",
      ...extra,
    },
    input,
  );
const output = make({ inputSourceMap: sourceMap });
const stack = remap([make({}).map, sourceMap], () => null);
const loader = remap(make({}).map, (source) =>
  source === "prepared.js" ? sourceMap : null,
);
assert.deepEqual(loader, stack);
const positions = [];
for (const api of [
  { TraceMap, originalPositionFor },
  require("@jridgewell/trace-mapping"),
]) {
  const tracer = new api.TraceMap(stack, "/maps/bundle.map");
  for (let col = 0; col <= output.code.length; col++)
    positions.push(api.originalPositionFor(tracer, { line: 1, column: col }));
}
assert.ok(positions.some(({ name }) => name === "answer"));
assert.ok(positions.some(({ source }) => source === "/maps/contest.ts"));
assert.deepEqual(output.map.sources, ["contest.ts"]);
console.log(
  JSON.stringify({
    code: output.code,
    composed: output.map,
    stack,
    positions,
    babelRaw: output.rawMappings,
    raw: allMappings(first),
    fields: decodedMappings(new TraceMap(output.map)),
  }),
);
