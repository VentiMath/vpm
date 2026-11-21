"use strict";
const { encode } = require("vsourcemap-codec");
const { TraceMap, decodedMappings } = require("vtrace-mapping");

class GenMapping {
  constructor({ file, sourceRoot } = {}) {
    this.file = file;
    this.sourceRoot = sourceRoot;
    this.lines = [];
    this.sources = [];
    this.contents = [];
    this.names = [];
    this.sourceIds = new Map();
    this.nameIds = new Map();
    this.ignored = new Set();
  }
}

function sourceId(map, source, content) {
  if (map.sources.length === 1 && map.sources[0] === source) return 0;
  let id = map.sourceIds.get(source);
  if (id === undefined) {
    id = map.sources.length;
    map.sourceIds.set(source, id);
    map.sources.push(source);
    map.contents.push(content ?? null);
  }
  return id;
}
function nameId(map, name) {
  let id = map.nameIds.get(name);
  if (id === undefined) {
    id = map.names.length;
    map.nameIds.set(name, id);
    map.names.push(name);
  }
  return id;
}
function position(line, column) {
  if (
    !Number.isSafeInteger(line) ||
    line < 0 ||
    line >= 0xffffffff ||
    !Number.isSafeInteger(column) ||
    column < 0
  )
    throw new RangeError("Expected nonnegative integer source-map coordinates");
}
// Appends are the common case. Out-of-order writes insert after all equal columns.
function insertion(row, column) {
  if (!row.length || row[row.length - 1][0] <= column) return row.length;
  let lo = 0,
    hi = row.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >>> 1);
    if (row[mid][0] <= column) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
function write(
  map,
  line,
  column,
  source,
  originalLine,
  originalColumn,
  name,
  content,
  skip,
) {
  position(line, column);
  if (source) position(originalLine, originalColumn);
  let row = map.lines[line];
  if (!row) {
    if (skip && !source) return;
    while (map.lines.length <= line) map.lines.push([]);
    row = map.lines[line];
  }
  const at = insertion(row, column),
    last = row[at - 1];
  let segment;
  if (source) {
    const file = sourceId(map, source, content),
      binding = name ? nameId(map, name) : undefined;
    if (
      skip &&
      last &&
      last[1] === file &&
      last[2] === originalLine &&
      last[3] === originalColumn &&
      last[4] === binding
    )
      return;
    segment =
      binding === undefined
        ? [column, file, originalLine, originalColumn]
        : [column, file, originalLine, originalColumn, binding];
  } else {
    if (skip && (!last || last.length === 1)) return;
    segment = [column];
  }
  if (at === row.length) row.push(segment);
  else row.splice(at, 0, segment);
}
function addSegment(map, line, column, source, ol, oc, name, content) {
  write(map, line, column, source, ol, oc, name, content, false);
}
function maybeAddSegment(map, line, column, source, ol, oc, name, content) {
  write(map, line, column, source, ol, oc, name, content, true);
}
function writeMapping(
  map,
  { generated, source, original, name, content },
  skip,
) {
  write(
    map,
    generated.line - 1,
    generated.column,
    source,
    original?.line - 1,
    original?.column,
    name,
    content,
    skip,
  );
}
function addMapping(map, item) {
  writeMapping(map, item, false);
}
function maybeAddMapping(map, item) {
  writeMapping(map, item, true);
}
function setSourceContent(map, source, content) {
  const id = sourceId(map, source, content);
  map.contents[id] = content;
}
function setIgnore(map, source, ignore = true) {
  const id = sourceId(map, source);
  if (ignore) map.ignored.add(id);
  else map.ignored.delete(id);
}
function fields(map, mappings) {
  return {
    version: 3,
    file: map.file,
    names: map.names,
    sourceRoot: map.sourceRoot,
    sources: map.sources,
    sourcesContent: map.contents,
    mappings,
    ignoreList: Array.from(map.ignored),
  };
}
function toDecodedMap(map) {
  return fields(map, map.lines);
}
function toEncodedMap(map) {
  return fields(map, encode(map.lines));
}
function allMappings(map) {
  const out = [];
  for (let i = 0; i < map.lines.length; i++)
    for (const seg of map.lines[i]) {
      out.push({
        generated: { line: i + 1, column: seg[0] },
        source: map.sources[seg[1]],
        original:
          seg.length > 1 ? { line: seg[2] + 1, column: seg[3] } : undefined,
        name: map.names[seg[4]],
      });
    }
  return out;
}
function indexTable(values) {
  const ids = new Map();
  for (let i = 0; i < values.length; i++)
    if (!ids.has(values[i])) ids.set(values[i], i);
  return ids;
}
function fromMap(input) {
  const src = new TraceMap(input),
    out = new GenMapping(src);
  // Preserve the slot referenced by every segment even if names or source URLs repeat.
  out.names = src.names.slice();
  out.nameIds = indexTable(out.names);
  out.sources = src.sources.slice();
  out.sourceIds = indexTable(out.sources);
  out.contents = out.sources.map((_, i) => src.sourcesContent?.[i] ?? null);
  out.ignored = new Set(src.ignoreList);
  const lines = decodedMappings(src);
  // A newly decoded string already belongs to this generator. Clone the row
  // arrays only when a caller can still hold and query them.
  const owned = typeof input === "string" || typeof input.mappings === "string";
  out.lines = owned ? lines : lines.map((row) => row.slice());
  while (out.lines.length && !out.lines.at(-1).length) out.lines.pop();
  return out;
}
module.exports = {
  GenMapping,
  addSegment,
  maybeAddSegment,
  addMapping,
  maybeAddMapping,
  setSourceContent,
  setIgnore,
  toDecodedMap,
  toEncodedMap,
  fromMap,
  allMappings,
};
