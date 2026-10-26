'use strict';

// Derived from etag 1.8.1, Copyright (c) 2014-2016 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.
const crypto = require('node:crypto');
const emptyTag = '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';

module.exports = function etag(entity, options) {
  let tag;
  let stats = false;
  if (typeof entity === 'string' || entity instanceof Uint8Array) {
    let length = entity.length;
    if (length === 0) tag = emptyTag;
    else {
      if (typeof entity === 'string') length = Buffer.byteLength(entity, 'utf8');
      const hash = typeof crypto.hash === 'function'
        ? crypto.hash('sha1', entity, 'base64')
        : crypto.createHash('sha1').update(entity, 'utf8').digest('base64');
      tag = '"' + length.toString(16) + '-' + hash.slice(0, 27) + '"';
    }
  } else if (entity && typeof entity === 'object' && 'size' in entity && 'mtime' in entity) {
    stats = true;
    const size = entity.size;
    if (!(typeof size === 'bigint' ? size >= 0n : Number.isSafeInteger(size) && size >= 0)) {
      throw new TypeError('stat size must be a non-negative safe integer or bigint');
    }
    let time;
    try { time = Date.prototype.getTime.call(entity.mtime); } catch {}
    if (!Number.isFinite(time)) throw new TypeError('stat mtime must be a valid Date');
    tag = '"' + size.toString(16) + '-' + time.toString(16) + '"';
  } else {
    throw new TypeError('entity must be a string, Uint8Array, or stat object');
  }
  const weak = typeof options?.weak === 'boolean' ? options.weak : stats;
  return weak ? 'W/' + tag : tag;
};
