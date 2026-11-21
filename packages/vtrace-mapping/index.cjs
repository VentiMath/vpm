"use strict";
const { encode, decode } = require("vsourcemap-codec");
const resolve = require("vresolve-uri");
const GREATEST_LOWER_BOUND = 1,
  LEAST_UPPER_BOUND = -1;
const sortedInput = Symbol("presorted");
function sortedLines(lines) {
  let sorted = lines;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    for (let j = 1; j < row.length; j++)
      if (row[j - 1][0] > row[j][0]) {
        if (sorted === lines) sorted = lines.slice();
        sorted[i] = row.slice().sort((a, b) => a[0] - b[0]);
        break;
      }
  }
  return sorted;
}
class TraceMap {
  constructor(input, mapUrl, order) {
    if (input instanceof TraceMap) return input;
    const map = typeof input === "string" ? JSON.parse(input) : input;
    if (
      !map ||
      !Array.isArray(map.sources) ||
      !(typeof map.mappings === "string" || Array.isArray(map.mappings))
    )
      throw new TypeError("Expected a source map with sources and mappings");
    this.version = map.version;
    this.file = map.file;
    this.sources = map.sources;
    this.names = map.names || [];
    this.sourceRoot = map.sourceRoot;
    this.sourcesContent = map.sourcesContent;
    this.ignoreList = map.ignoreList ?? map.x_google_ignoreList;
    const prefix = this.sourceRoot ? this.sourceRoot.replace(/\/?$/, "/") : "";
    const directory = mapUrl
      ? mapUrl.slice(0, mapUrl.lastIndexOf("/") + 1)
      : "";
    this.resolvedSources = this.sources.map((source) =>
      resolve(prefix + (source || ""), directory),
    );
    if (typeof map.mappings === "string") this._encoded = map.mappings;
    else
      this._decoded =
        order === sortedInput ? map.mappings : sortedLines(map.mappings);
  }
}
function presortedDecodedMap(input, url) {
  return new TraceMap(input, url, sortedInput);
}
function decodedMappings(map) {
  return (map._decoded ??= decode(map._encoded));
}
function encodedMappings(map) {
  return (map._encoded ??= encode(map._decoded));
}
function mapFields(map, mappings) {
  const {
    version,
    file,
    names,
    sourceRoot,
    sources,
    sourcesContent,
    ignoreList,
  } = map;
  return {
    version,
    file,
    names,
    sourceRoot,
    sources,
    sourcesContent,
    mappings,
    ignoreList,
  };
}
function decodedMap(map) {
  return mapFields(map, decodedMappings(map));
}
function encodedMap(map) {
  return mapFields(map, encodedMappings(map));
}

// For an exact match, lower bias selects the first duplicate, upper the last.
// Between columns, the two biases select the preceding or following segment.
function columnIndex(row, column, bias) {
  let lo = 0,
    hi = row.length;
  const upper = bias === LEAST_UPPER_BOUND;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >>> 1),
      current = row[mid][0];
    if (current < column || (upper && current === column)) lo = mid + 1;
    else hi = mid;
  }
  if (upper) return lo && row[lo - 1][0] === column ? lo - 1 : lo;
  return lo < row.length && row[lo][0] === column ? lo : lo - 1;
}
function segmentAt(map, line, column, bias) {
  const row = decodedMappings(map)[line];
  if (!row?.length) return null;
  // Most generated lines are short. Scan them directly, keeping the first
  // exact match for lower bias and the last exact match for upper bias.
  if (row.length <= 12) {
    if (bias === LEAST_UPPER_BOUND) {
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i][0] === column) return row[i];
        if (row[i][0] < column) return row[i + 1] ?? null;
      }
      return row[0];
    }
    for (let i = 0; i < row.length; i++) {
      if (row[i][0] === column) return row[i];
      if (row[i][0] > column) return i ? row[i - 1] : null;
    }
    return row[row.length - 1];
  }
  return row[columnIndex(row, column, bias)] ?? null;
}
function traceSegment(map, line, column) {
  return segmentAt(map, line, column, GREATEST_LOWER_BOUND);
}
function validatePosition(line, column) {
  if (!Number.isSafeInteger(line) || line < 1)
    throw new RangeError("Expected a positive, one-based line");
  if (!Number.isSafeInteger(column) || column < 0)
    throw new RangeError("Expected a nonnegative, zero-based column");
}
function originalPositionFor(
  map,
  { line, column, bias = GREATEST_LOWER_BOUND },
) {
  validatePosition(line, column);
  const seg = segmentAt(map, line - 1, column, bias);
  if (!seg || seg.length === 1)
    return { source: null, line: null, column: null, name: null };
  return {
    source: map.resolvedSources[seg[1]],
    line: seg[2] + 1,
    column: seg[3],
    name: seg.length === 5 ? map.names[seg[4]] : null,
  };
}
function sourceId(map, source) {
  const id = map.sources.indexOf(source);
  return id >= 0 ? id : map.resolvedSources.indexOf(source);
}
function sourceContentFor(map, source) {
  return map.sourcesContent?.[sourceId(map, source)] ?? null;
}
function isIgnored(map, source) {
  return map.ignoreList?.includes(sourceId(map, source)) ?? false;
}
function eachMapping(map, fn) {
  const lines = decodedMappings(map);
  for (let line = 0; line < lines.length; line++)
    for (const seg of lines[line]) {
      const mapped = seg.length > 1;
      fn({
        generatedLine: line + 1,
        generatedColumn: seg[0],
        source: mapped ? map.resolvedSources[seg[1]] : null,
        originalLine: mapped ? seg[2] + 1 : null,
        originalColumn: mapped ? seg[3] : null,
        name: seg.length === 5 ? map.names[seg[4]] : null,
      });
    }
}
function reverseIndex(map) {
  if (map._reverse) return map._reverse;
  const sources = new Map(),
    lines = decodedMappings(map);
  for (let i = 0; i < lines.length; i++)
    for (const seg of lines[i]) {
      if (seg.length === 1) continue;
      let byLine = sources.get(seg[1]);
      if (!byLine) sources.set(seg[1], (byLine = new Map()));
      let row = byLine.get(seg[2]);
      if (!row) byLine.set(seg[2], (row = []));
      row.push([seg[3], i + 1, seg[0]]);
    }
  for (const byLine of sources.values())
    for (const row of byLine.values()) row.sort((a, b) => a[0] - b[0]);
  return (map._reverse = sources);
}
function reverseRow(map, { source, line, column }) {
  validatePosition(line, column);
  const id = sourceId(map, source);
  return id < 0
    ? undefined
    : reverseIndex(map)
        .get(id)
        ?.get(line - 1);
}
function generatedPositionFor(map, needle) {
  const row = reverseRow(map, needle);
  const seg = row?.[columnIndex(row, needle.column, needle.bias)];
  return seg ? { line: seg[1], column: seg[2] } : { line: null, column: null };
}
function allGeneratedPositionsFor(map, needle) {
  const row = reverseRow(map, needle);
  if (!row) return [];
  let at = columnIndex(row, needle.column, needle.bias ?? LEAST_UPPER_BOUND);
  if (!row[at]) return [];
  const column = row[at][0],
    out = [];
  while (at > 0 && row[at - 1][0] === column) at--;
  while (at < row.length && row[at][0] === column) {
    out.push({ line: row[at][1], column: row[at][2] });
    at++;
  }
  return out;
}
module.exports = {
  TraceMap,
  presortedDecodedMap,
  decodedMappings,
  encodedMappings,
  decodedMap,
  encodedMap,
  traceSegment,
  originalPositionFor,
  generatedPositionFor,
  allGeneratedPositionsFor,
  eachMapping,
  sourceContentFor,
  isIgnored,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
};
