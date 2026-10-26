'use strict';

// Derived from encodeurl 2.0.0, Copyright (c) 2016 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

// Keep encodeurl's character set. Look ahead at percent escapes without consuming
// their neighbors, so an invalid percent cannot swallow a following valid escape.
const encodeChars = /(?:[^\x21\x23-\x3B\x3D\x3F-\x5F\x61-\x7A\x7C\x7E]|%(?![0-9A-Fa-f]{2}))+/g;

module.exports = encodeUrl;

function encodeUrl(url) {
  // Native UTF-16 repair handles consecutive unpaired surrogates correctly.
  return String(url).toWellFormed().replace(encodeChars, encodeURI);
}
