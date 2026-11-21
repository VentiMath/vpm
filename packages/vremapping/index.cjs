"use strict";
const { TraceMap, decodedMappings, traceSegment } = require("vtrace-mapping");
const {
  GenMapping,
  maybeAddSegment,
  setSourceContent,
  setIgnore,
  toDecodedMap,
  toEncodedMap,
} = require("vgen-mapping");

// Resolve loader calls depth first, in source-table order. Frames keep long
// transform pipelines off the JavaScript call stack.
function connect(inputs, loader) {
  if (!inputs.length) throw new TypeError("Expected at least one source map");
  const maps = inputs.map((input) => new TraceMap(input));
  for (const transform of maps.slice(0, -1)) {
    if (transform.sources.length > 1)
      throw new Error(
        "Each intermediate transformation map must have at most one source file",
      );
  }
  let root = { map: maps.pop(), children: [] };
  const frames = [{ node: root, importer: "" }];
  while (frames.length) {
    const { node, importer } = frames[frames.length - 1];
    const id = node.children.length;
    if (id === node.map.sources.length) {
      frames.pop();
      continue;
    }
    const source = node.map.resolvedSources[id];
    const ctx = {
      importer,
      depth: frames.length,
      source,
      content: undefined,
      ignore: undefined,
    };
    const loaded = loader(source, ctx);
    if (loaded) {
      const child = { map: new TraceMap(loaded, ctx.source), children: [] };
      node.children.push(child);
      frames.push({ node: child, importer: ctx.source });
    } else {
      node.children.push({
        source: ctx.source,
        content:
          ctx.content === undefined
            ? (node.map.sourcesContent?.[id] ?? null)
            : ctx.content,
        ignored: ctx.ignore ?? node.map.ignoreList?.includes(id) ?? false,
      });
    }
  }
  while (maps.length) root = { map: maps.pop(), children: [root] };
  return root;
}

class SourceMap {
  constructor(map, options) {
    const result = options.decodedMappings
      ? toDecodedMap(map)
      : toEncodedMap(map);
    this.version = 3;
    this.file = result.file;
    this.mappings = result.mappings;
    this.names = result.names;
    this.ignoreList = result.ignoreList;
    this.sourceRoot = result.sourceRoot;
    this.sources = result.sources;
    if (!options.excludeContent) this.sourcesContent = result.sourcesContent;
  }
  toString() {
    return JSON.stringify(this);
  }
}

function remapping(input, loader, options = {}) {
  const root = connect(Array.isArray(input) ? input : [input], loader);
  const output = new GenMapping({ file: root.map.file });
  const rows = decodedMappings(root.map);
  let previousLeaf;
  for (let row = 0; row < rows.length; row++) {
    for (const start of rows[row]) {
      let node = root;
      let segment = start;
      let name;
      while (segment && segment.length > 1) {
        if (segment.length === 5) name = node.map.names[segment[4]];
        node = node.children[segment[1]];
        if (!node)
          throw new RangeError(
            "Source map segment references an unknown source",
          );
        if (!node.map) {
          maybeAddSegment(
            output,
            row,
            start[0],
            node.source,
            segment[2],
            segment[3],
            name,
            node.content,
          );
          if (previousLeaf !== node) {
            if (node.content != null)
              setSourceContent(output, node.source, node.content);
            if (node.ignored) setIgnore(output, node.source);
            previousLeaf = node;
          }
          break;
        }
        segment = traceSegment(node.map, segment[2], segment[3]);
      }
      // An explicit unmapped segment ends a range. A lookup outside a map
      // has no segment to contribute.
      if (segment?.length === 1) maybeAddSegment(output, row, start[0]);
    }
  }
  return new SourceMap(
    output,
    typeof options === "boolean" ? { excludeContent: options } : options,
  );
}
module.exports = remapping;
