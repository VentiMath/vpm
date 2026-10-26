'use strict';

// Derived from escape-html 1.0.3, Copyright (c) 2012-2013 TJ Holowaychuk,
// Copyright (c) 2015 Andreas Lubbe and Tiancheng "Timothy" Gu.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const special = /["'&<>]/g;

module.exports = escapeHtml;

function escapeHtml(value) {
  // Preserve upstream's default-hint conversion, including Symbol rejection.
  // Coerce before resetting the scanner: conversion may call escapeHtml again.
  const str = '' + value;
  special.lastIndex = 0;
  if (!special.test(str)) return str;

  let html = '';
  let last = 0;
  let index = special.lastIndex - 1;
  while (index < str.length) {
    let escaped;
    switch (str.charCodeAt(index)) {
      case 34: escaped = '&quot;'; break;
      case 38: escaped = '&amp;'; break;
      case 39: escaped = '&#39;'; break;
      case 60: escaped = '&lt;'; break;
      case 62: escaped = '&gt;'; break;
      default:
        // Scan short gaps locally; let the native regexp skip longer spans.
        if (index - last < 16) {
          index++;
          continue;
        }
        special.lastIndex = index + 1;
        if (!special.test(str)) return html + str.slice(last);
        index = special.lastIndex - 1;
        continue;
    }
    if (last !== index) html += str.slice(last, index);
    html += escaped;
    last = ++index;
  }
  return html + str.slice(last);
}
