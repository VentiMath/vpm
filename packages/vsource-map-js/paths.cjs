'use strict';

const absoluteURL = /^[a-z][a-z0-9+.-]*:/i;
function resolveSource(root, source) {
  if (absoluteURL.test(source)) return source;
  if (root && absoluteURL.test(root)) return new URL(source, root.replace(/\/?$/, '/')).href;
  if (source.startsWith('//')) return source;
  const combined = !root || source.startsWith('/') ? source : root + '/' + source;
  const parts = [];
  for (const part of combined.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop();
    else if (part !== '..' || parts.length || !combined.startsWith('/')) parts.push(part);
  }
  return (combined.startsWith('/') ? '/' : '') + parts.join('/') || '.';
}
function relativeSource(root, source) {
  if (!root) return source;
  const prefix = root.replace(/\/?$/, '/');
  return source.startsWith(prefix) ? source.slice(prefix.length) : source;
}
module.exports = { resolveSource, relativeSource };
