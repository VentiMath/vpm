'use strict';

// Derived from range-parser 1.2.1, Copyright (c) 2012-2014 TJ Holowaychuk and
// Copyright (c) 2015-2016 Douglas Christopher Wilson. Copyright (c) 2026 VentiMath.
// MIT licensed; see LICENSE.

module.exports = function rangeParser(size, value, options) {
  if (!Number.isSafeInteger(size) || size < 0) throw new TypeError('size must be a non-negative safe integer');
  if (typeof value !== 'string') throw new TypeError('argument str must be a string');
  const equals = value.indexOf('=');
  if (equals < 1) return -2;
  const type = value.slice(0, equals);
  if (/[^!#$%&'*+.^_`|~0-9A-Za-z-]/.test(type)) return -2;
  const ranges = [];
  ranges.type = type.toLowerCase();
  let offset = equals + 1;
  let members = 0;
  while (offset <= value.length) {
    let comma = value.indexOf(',', offset);
    if (comma < 0) comma = value.length;
    const item = value.slice(offset, comma);
    offset = comma + 1;
    if (!/[^ \t]/.test(item)) continue;
    const match = /^[ \t]*([0-9]*)-([0-9]*)[ \t]*$/.exec(item);
    if (!match || match[0].length !== item.length || (!match[1] && !match[2])) return -2;
    members++;
    // Clamping before arithmetic keeps even extremely long decimals safe.
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    const start = match[1] ? Math.min(Number(match[1]), size) : size - Math.min(Number(match[2]), size);
    if (start > end) continue;
    ranges.push({ start, end });
  }
  if (!members) return -2;
  if (!ranges.length) return -1;
  return options?.combine && ranges.length > 1 ? combine(ranges) : ranges;
};

function combine(ranges) {
  const ordered = ranges.map((range, index) => ({ ...range, index })).sort((a, b) => a.start - b.start);
  let last = 0;
  for (let i = 1; i < ordered.length; i++) {
    const current = ordered[last];
    const next = ordered[i];
    if (next.start > current.end + 1) ordered[++last] = next;
    else {
      current.end = Math.max(current.end, next.end);
      // A contained earlier member also determines the group's input order.
      current.index = Math.min(current.index, next.index);
    }
  }
  ordered.length = last + 1;
  const combined = ordered.sort((a, b) => a.index - b.index).map(({ start, end }) => ({ start, end }));
  combined.type = ranges.type;
  return combined;
}
