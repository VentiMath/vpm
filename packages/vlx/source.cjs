'use strict';
class VlxError extends Error {
  constructor(code, message, details = {}) { super(message, {cause: details.cause}); this.name = 'VlxError'; this.code = code; Object.assign(this, details); }
}
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function bound(value, fallback, name, ceiling) {
  const n = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(n) || n < 0 || n > ceiling) throw new RangeError(`${name} must be an integer from 0 to ${ceiling}`);
  return n;
}
function sourceText(value, max) {
  if (typeof value !== 'string') throw new TypeError('Source must be a string');
  if (value.length > max) throw new VlxError('LIMIT', 'Source exceeds the configured length limit');
}
function parse(source, options = {}) {
  sourceText(source, bound(options.maxLength, 131072, 'maxLength', 1048576));
  const nodes = [], diagnostics = [];
  let i = 0, textStart = 0;
  const text = end => { if (end > textStart) nodes.push({kind:'text', raw:source.slice(textStart,end), value:source.slice(textStart,end).replace(/\\\$/g,'$'), start:textStart, end}); };
  while (i < source.length) {
    let open, close;
    if (source[i] === '$') { open = source[i+1] === '$' ? '$$' : '$'; close = open; }
    else if (source[i] === '\\' && (source[i+1] === '(' || source[i+1] === '[')) { open = source.slice(i,i+2); close = source[i+1] === '(' ? '\\)' : '\\]'; }
    else { i += source[i] === '\\' && (source[i+1] === '\\' || source[i+1] === '$') ? 2 : 1; continue; }
    let j = i + open.length, depth = 0, found = false;
    while (j < source.length) {
      if (depth === 0 && source.startsWith(close,j)) { found = true; break; }
      const char = source[j];
      if (char === '\\') { j += 2; continue; }
      if (char === '%') { const newline = source.indexOf('\n',j); j = newline < 0 ? source.length : newline + 1; continue; }
      if (char === '{') depth++;
      if (char === '}') depth--;
      j++;
    }
    if (!found) { diagnostics.push({code:'UNCLOSED_MATH',start:i,end:source.length,message:`Unclosed ${open} math delimiter`}); break; }
    text(i);
    const end = j + close.length;
    nodes.push({kind:'math',tex:source.slice(i+open.length,j),raw:source.slice(i,end),display:open==='$$'||open==='\\[',delimiter:open,start:i,end});
    textStart = i = end;
  }
  text(source.length);
  return {source,nodes,diagnostics};
}
exports.parse=parse;
exports.escape=escape;
exports.VlxError=VlxError;
