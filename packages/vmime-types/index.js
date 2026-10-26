'use strict';

// Derived from mime-types 3.0.2, Copyright (c) 2014 Jonathan Ong and
// Copyright (c) 2015 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.
const db = require('vmime-db');
const { extname } = require('node:path');
const extensions = Object.create(null);
const types = Object.create(null);
const headers = Object.create(null);
const scores = Object.create(null);

// Preserve upstream's scoring and its later-entry tie break, computing each
// type's score once. No temporary legacy-conflict diagnostics run at startup.
for (const [type, record] of Object.entries(db)) {
  const charset = defaultCharset(type);
  headers[type] = charset ? type + '; charset=' + charset.toLowerCase() : type;
  if (!record.extensions?.length) continue;
  extensions[type] = record.extensions;
  const [category, subtype] = type.split('/');
  const facet = subtype.replace(/(\.|x-).*/, '$1');
  const score = type === 'application/octet-stream' ? 0 :
    ({ 'prs.': 100, 'x-': 200, 'x.': 300, 'vnd.': 400 }[facet] || 900) +
    ({ nginx: 10, apache: 20, iana: 40 }[record.source] || 30) +
    ({ application: 1, font: 2, audio: 2, video: 3 }[category] || 0) +
    (1 - type.length / 100);
  for (const extension of record.extensions) {
    if (scores[extension] > score) continue;
    scores[extension] = score;
    types[extension] = type;
  }
}
Object.freeze(extensions);
Object.freeze(types);

const mediaType = /^[\t ]*([!#$%&'*+\-.^_`|~0-9A-Za-z]+\/[!#$%&'*+\-.^_`|~0-9A-Za-z]+)[\t ]*/;
const parameter = /;[\t ]*(?:([!#$%&'*+\-.^_`|~0-9A-Za-z]+)=(?:[!#$%&'*+\-.^_`|~0-9A-Za-z]+|"(?:[\t\x20\x21\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\t\x20-\x7e\x80-\xff])*"))?[\t ]*/y;

function parse(value) {
  const match = mediaType.exec(value);
  if (!match) return false;
  let index = match[0].length;
  let hasCharset = false;
  while (index < value.length) {
    parameter.lastIndex = index;
    const next = parameter.exec(value);
    if (!next) return false;
    if (next[1]?.toLowerCase() === 'charset') {
      if (hasCharset) return false;
      hasCharset = true;
    }
    index = parameter.lastIndex;
  }
  return { type: match[1].toLowerCase(), hasCharset };
}

function defaultCharset(type) {
  return db[type]?.charset || (type.startsWith('text/') ? 'UTF-8' : false);
}

function charset(value) {
  if (typeof value !== 'string' || !value) return false;
  if (db[value]) return defaultCharset(value);
  const parsed = parse(value);
  return parsed ? defaultCharset(parsed.type) : false;
}

function extension(value) {
  if (typeof value !== 'string' || !value) return false;
  if (extensions[value]) return extensions[value][0];
  const parsed = parse(value);
  return parsed && extensions[parsed.type]?.[0] || false;
}

function lookup(value) {
  if (typeof value !== 'string' || !value) return false;
  // Common bare and dotted extensions avoid path parsing. The fallback retains native
  // platform path, trailing separator, dotfile, and final-extension semantics.
  const dot = value.indexOf('.');
  if (dot <= 0) {
    const direct = types[(dot === 0 ? value.slice(1) : value).toLowerCase()];
    if (direct) return direct;
  }
  return types[extname('x.' + value).slice(1).toLowerCase()] || false;
}

function contentType(value) {
  if (typeof value !== 'string' || !value) return false;
  if (!value.includes('/')) {
    const type = lookup(value);
    return type ? headers[type] : false;
  }
  if (headers[value]) return headers[value];
  const parsed = parse(value);
  if (!parsed) return false;
  const charset = parsed.hasCharset ? false : defaultCharset(parsed.type);
  return charset ? value + '; charset=' + charset.toLowerCase() : value;
}

module.exports = Object.freeze({
  charset, charsets: Object.freeze({ lookup: charset }), contentType, extension,
  extensions, lookup, types,
});
