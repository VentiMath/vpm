'use strict';
const { encode } = require('./codec.cjs');
const { relativeSource, resolveSource } = require('./paths.cjs');

function validPosition(p) {
  return Number.isSafeInteger(p?.line) && p.line > 0 && Number.isSafeInteger(p.column) && p.column >= 0;
}
function intern(table, key) {
  if (!table.has(key)) table.set(key, table.size);
  return table.get(key);
}

class SourceMapGenerator {
  constructor({ file, sourceRoot, ignoreInvalidMapping = false } = {}) {
    this.file = file;
    this.sourceRoot = sourceRoot;
    this.ignoreInvalidMapping = ignoreInvalidMapping;
    this.entries = [];
    this.sources = new Map();
    this.names = new Map();
    this.contents = new Map();
  }

  addMapping({ generated, original, source, name }) {
    const mapped = source != null && validPosition(original);
    if (!validPosition(generated) || (!mapped && (original != null || source != null || name != null))) {
      if (this.ignoreInvalidMapping) return;
      throw new TypeError('Invalid mapping');
    }
    source = mapped ? String(source) : null;
    name = name == null ? null : String(name);
    if (mapped) intern(this.sources, source);
    if (name !== null) intern(this.names, name);
    // CSS Tree reuses and mutates both position objects between calls.
    this.entries.push({ line: generated.line, column: generated.column, source,
      originalLine: original?.line, originalColumn: original?.column, name });
  }

  setSourceContent(source, content) {
    const key = relativeSource(this.sourceRoot, source);
    if (content == null) this.contents.delete(key);
    else this.contents.set(key, content);
  }

  static fromSourceMap(consumer, options) {
    const generator = new SourceMapGenerator({ file: consumer.file, sourceRoot: consumer.sourceRoot, ...options });
    consumer.eachMapping(m => generator.addMapping({
      generated: { line: m.generatedLine, column: m.generatedColumn },
      source: m.source == null ? null : relativeSource(generator.sourceRoot, m.source),
      original: m.source == null ? null : { line: m.originalLine, column: m.originalColumn },
      name: m.name
    }));
    for (const source of consumer.sources) {
      intern(generator.sources, relativeSource(generator.sourceRoot, source));
      generator.setSourceContent(source, consumer.sourceContentFor(source, true));
    }
    return generator;
  }

  applySourceMap(consumer, file = consumer.file, path) {
    if (file == null) throw new TypeError('A source file is required to compose maps');
    const target = relativeSource(this.sourceRoot, file);
    const rebase = source => relativeSource(this.sourceRoot, path ? resolveSource(path, source) : source);
    const sources = new Map(), names = new Map();
    for (const m of this.entries) {
      if (m.source === target) {
        const position = consumer.originalPositionFor({ line: m.originalLine, column: m.originalColumn });
        if (position.source != null) {
          m.source = rebase(position.source);
          m.originalLine = position.line;
          m.originalColumn = position.column;
          m.name = position.name ?? m.name;
        }
      }
      if (m.source != null) intern(sources, m.source);
      if (m.name != null) intern(names, m.name);
    }
    this.sources = sources;
    this.names = names;
    for (const source of consumer.sources) {
      const content = consumer.sourceContentFor(source, true);
      if (content != null) this.setSourceContent(rebase(source), content);
    }
  }

  toJSON() {
    let mappings = '', line = 1, column = 0, src = 0, row = 1, col = 0, name = 0;
    const sorted = this.entries.toSorted((a,b) => a.line - b.line || a.column - b.column);
    let previous;
    for (const m of sorted) {
      if (previous && m.line === previous.line && m.column === previous.column &&
          m.source === previous.source && m.originalLine === previous.originalLine &&
          m.originalColumn === previous.originalColumn && m.name === previous.name) continue;
      if (line !== m.line) {
        mappings += ';'.repeat(m.line - line);
        line = m.line;
        column = 0;
      } else if (previous) mappings += ',';
      mappings += encode(m.column - column);
      column = m.column;
      if (m.source !== null) {
        const next = this.sources.get(m.source);
        mappings += encode(next - src) + encode(m.originalLine - row) + encode(m.originalColumn - col);
        src = next;
        row = m.originalLine;
        col = m.originalColumn;
        if (m.name !== null) {
          const nextName = this.names.get(m.name);
          mappings += encode(nextName - name);
          name = nextName;
        }
      }
      previous = m;
    }
    const sources = [...this.sources.keys()];
    const map = { version: 3, sources, names: [...this.names.keys()], mappings };
    if (this.file != null) map.file = this.file;
    if (this.sourceRoot != null) map.sourceRoot = this.sourceRoot;
    if (this.contents.size) map.sourcesContent = sources.map(s => this.contents.get(relativeSource(this.sourceRoot, s)) ?? null);
    return map;
  }
  toString() { return JSON.stringify(this.toJSON()); }
}
module.exports = { SourceMapGenerator };
