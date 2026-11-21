import {
  TraceMap,
  originalPositionFor,
  generatedPositionFor,
  type SourceMapSegment,
} from "vtrace-mapping";
const segment: SourceMapSegment = [0, 0, 1, 3];
const map = new TraceMap({
  version: 3,
  sources: ["app.ts"],
  names: [],
  mappings: [[segment]],
} as const);
const result = originalPositionFor(map, { line: 1, column: 0 });
if (result.source)
  generatedPositionFor(map, {
    source: result.source,
    line: result.line,
    column: result.column,
  });
// @ts-expect-error Source lines are numeric.
originalPositionFor(map, { line: "2", column: 0 });
