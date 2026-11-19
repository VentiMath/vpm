'use strict';
const { decode } = require('./codec.cjs');
const { resolveSource } = require('./paths.cjs');

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
    const lines = this.encoded.split(';').map((line, index) => {
      let generatedColumn = 0;
      if (!line) return [];
      const rows = line.split(',').map(segment => {
        const fields = decode(segment);
        generatedColumn += fields[0];
        if (generatedColumn < 0) throw new RangeError('Invalid generated column');
        const row = { generatedLine: index + 1, generatedColumn, source: null, originalLine: null, originalColumn: null, name: null };
        if (fields.length >= 4) {
          source += fields[1];
          originalLine += fields[2];
          originalColumn += fields[3];
          if (source < 0 || source >= this.sources.length || originalLine < 1 || originalColumn < 0)
            throw new RangeError('Invalid original position');
          Object.assign(row, { source: this.sources[source], originalLine, originalColumn });
          if (fields.length === 5) {
            name += fields[4];
            if (name < 0 || name >= this.names.length) throw new RangeError('Invalid name index');
            row.name = this.names[name];
          }
        }
        return row;
      });
      return rows.sort((a,b) => a.generatedColumn - b.generatedColumn);
    });
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
