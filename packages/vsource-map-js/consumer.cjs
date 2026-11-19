'use strict';
const { readDelta } = require('./codec.cjs');
const { resolveSource } = require('./paths.cjs');

function hasField(text, index) {
  const code = text.charCodeAt(index);
  return index < text.length && code !== 44 && code !== 59;
}

class SourceMapConsumer {
  static GENERATED_ORDER = 1;
  static GREATEST_LOWER_BOUND = 1;
  static LEAST_UPPER_BOUND = 2;

  constructor(input) {
    const map = typeof input === 'string' ? JSON.parse(input.replace(/^\)\]\}'[^\n]*\n/, '')) : input;
    if (!map || Number(map.version) !== 3 || !Array.isArray(map.sources) || typeof map.mappings !== 'string')
      throw new TypeError('Expected a flat version 3 source map');
    this.file = map.file ?? null;
    this.sourceRoot = map.sourceRoot ?? null;
    this.sourcesContent = map.sourcesContent ?? null;
    this.rawSources = map.sources;
    this.sources = map.sources.map(s => resolveSource(this.sourceRoot, s));
    this.names = map.names || [];
    this.encoded = map.mappings;
  }

  readLines() {
    if (this.lines) return this.lines;
    let source = 0, originalLine = 1, originalColumn = 0, name = 0;
    const text = this.encoded;
    const cursor = {text, index: 0};
    const lines = [];
    do {
      const rows = [];
      const generatedLine = lines.length + 1;
      let generatedColumn = 0, ordered = true;
      if (cursor.index < text.length && text.charCodeAt(cursor.index) !== 59) {
        for (;;) {
          const delta = readDelta(cursor);
          if (delta < 0) ordered = false;
          generatedColumn += delta;
          if (generatedColumn < 0) throw new RangeError('Invalid generated column');
          let mappedSource = null, mappedLine = null, mappedColumn = null, mappedName = null;
          if (hasField(text, cursor.index)) {
            source += readDelta(cursor);
            originalLine += readDelta(cursor);
            originalColumn += readDelta(cursor);
            if (source < 0 || source >= this.sources.length || originalLine < 1 || originalColumn < 0)
              throw new RangeError('Invalid original position');
            mappedSource = this.sources[source];
            mappedLine = originalLine;
            mappedColumn = originalColumn;
            if (hasField(text, cursor.index)) {
              name += readDelta(cursor);
              if (name < 0 || name >= this.names.length) throw new RangeError('Invalid name index');
              mappedName = this.names[name];
              if (hasField(text, cursor.index)) throw new SyntaxError('Excess mapping fields');
            }
          }
          rows.push({generatedLine, generatedColumn, source: mappedSource,
            originalLine: mappedLine, originalColumn: mappedColumn, name: mappedName});
          if (text.charCodeAt(cursor.index) !== 44) break;
          cursor.index++;
        }
      }
      if (!ordered) rows.sort((a,b) => a.generatedColumn - b.generatedColumn);
      lines.push(rows);
      // Consume the line separator. Commit the index only after the whole map validates.
    } while (cursor.index++ < text.length);
    return this.lines = lines;
  }

  originalPositionFor({ line, column, bias = 1 }) {
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(column) || column < 0)
      throw new RangeError('Expected a positive line and a nonnegative column');
    const rows = this.readLines()[line - 1] || [];
    let low = 0, high = rows.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (rows[mid].generatedColumn < column) low = mid + 1;
      else high = mid;
    }
    if (bias !== 2 && rows[low]?.generatedColumn !== column) {
      low--;
      while (low > 0 && rows[low-1].generatedColumn === rows[low].generatedColumn) low--;
    }
    const row = rows[low];
    return { source: row?.source ?? null, line: row?.originalLine ?? null, column: row?.originalColumn ?? null, name: row?.name ?? null };
  }

  eachMapping(callback, context, order = 1) {
    if (order !== 1) throw new RangeError('Only generated order is supported');
    for (const line of this.readLines()) for (const row of line) callback.call(context, { ...row });
  }

  sourceContentFor(source, allowMissing) {
    if (!this.sourcesContent) return null;
    let index = this.sources.indexOf(source);
    if (index < 0) index = this.rawSources.indexOf(source);
    if (index < 0 && !allowMissing) throw new Error('Unknown source: ' + source);
    return this.sourcesContent[index] ?? null;
  }
}
module.exports = { SourceMapConsumer };
