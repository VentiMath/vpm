'use strict';

// Derived from fresh 2.0.0, Copyright (c) 2012 TJ Holowaychuk and
// Copyright (c) 2016-2017 Douglas Christopher Wilson. Copyright (c) 2026 VentiMath.
// MIT licensed; see LICENSE.
const entityTag = /^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/;
const cacheDirective = /(?:^|,)[ \t]*no-cache[ \t]*(?:=|,|$)/i;

module.exports = function fresh(request, response) {
  const noneMatch = request['if-none-match'];
  const modifiedSince = request['if-modified-since'];
  const hasNoneMatch = noneMatch !== undefined && noneMatch !== '';
  if (!hasNoneMatch && !modifiedSince) return false;
  const cacheControl = listValue(request['cache-control']);
  if (cacheControl && noCache(cacheControl)) return false;

  if (hasNoneMatch) {
    const list = listValue(noneMatch);
    if (list === undefined) return false;
    if (list === '*') return true;
    if ((ows(list.charCodeAt(0)) || list[0] === '*') && list.replace(/^[ \t]+|[ \t]+$/g, '') === '*') return true;
    const etag = response.etag;
    if (typeof etag !== 'string' || etag.charCodeAt(etag.length - 1) !== 34 || !entityTag.test(etag)) return false;
    if (list === etag) return true;
    const opaque = etag.startsWith('W/') ? etag.slice(2) : etag;
    if (list === opaque || list === 'W/' + opaque) return true;
    let matched = false;
    let index = 0;
    while (index < list.length) {
      // HTTP lists permit empty members and optional space/tab around commas.
      while (ows(list.charCodeAt(index)) || list[index] === ',') index++;
      if (index === list.length) break;
      const start = list.startsWith('W/', index) ? index + 2 : index;
      const end = tagEnd(list, index);
      if (end < 0) return false;
      if (list.slice(start, end) === opaque) matched = true;
      index = end;
      while (ows(list.charCodeAt(index))) index++;
      if (index < list.length && list[index] !== ',') return false;
    }
    return matched;
  }

  const lastModified = response['last-modified'];
  return typeof modifiedSince === 'string' && typeof lastModified === 'string' &&
    Date.parse(lastModified) <= Date.parse(modifiedSince);
};

function ows(code) { return code === 32 || code === 9; }

function listValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.join(',');
}

function tagEnd(value, index) {
  if (value.startsWith('W/', index)) index += 2;
  if (value.charCodeAt(index++) !== 34) return -1;
  while (index < value.length) {
    const code = value.charCodeAt(index++);
    if (code === 34) return index;
    if (!(code === 33 || (code >= 35 && code <= 126) || (code >= 128 && code <= 255))) return -1;
  }
  return -1;
}

function noCache(value) {
  if (!value.includes('"')) return cacheDirective.test(value);
  let start = 0;
  let quoted = false;
  for (let i = 0; i <= value.length; i++) {
    const char = value[i];
    if (quoted && char === '\\') { i++; continue; }
    if (char === '"') quoted = !quoted;
    if (i === value.length || (char === ',' && !quoted)) {
      const directive = value.slice(start, i);
      if (/^[ \t]*no-cache[ \t]*(?:=|$)/i.test(directive)) return true;
      start = i + 1;
    }
  }
  return false;
}
