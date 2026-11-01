'use strict';
// An inline source map for styles: one mapping from the start of the
// generated CSS to where the styles are written. The JSON has the shape and
// key order of source-map's SourceMapGenerator, so the comments match those
// @emotion/babel-plugin writes.

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 VLQ of an integer. */
function vlq(value) {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1;
  let encoded = '';
  do {
    let digit = rest & 31;
    rest >>>= 5;
    if (rest > 0) digit |= 32;
    encoded += BASE64[digit];
  } while (rest > 0);
  return encoded;
}

const generatorOptions = file => (file.opts.generatorOpts ? file.opts.generatorOpts : file.opts);

/**
 * @param {{line: number, column: number}} offset where the styles start (line from 1)
 * @returns {string} a CSS comment, or '' without a source file name
 */
exports.getSourceMap = (offset, state) => {
  const options = generatorOptions(state.file);
  const source = options.sourceFileName;
  if (!source || source === 'unknown') return '';
  const map = {version: 3, sources: [source], names: [], mappings: vlq(0) + vlq(0) + vlq(offset.line - 1) + vlq(offset.column), file: source};
  if (options.sourceRoot != null) map.sourceRoot = options.sourceRoot;
  map.sourcesContent = [state.file.code];
  return `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(JSON.stringify(map)).toString('base64')} */`;
};
