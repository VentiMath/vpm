'use strict';
/*!
 * vmedia-typer
 * Derived from media-typer, Copyright(c) 2014-2017 Douglas Christopher Wilson.
 * Copyright(c) 2026 VentiMath contributors. MIT Licensed.
 */

// A strict end-of-input assertion also rejects a final newline (unlike $).
const TYPE_NAME = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}(?![\s\S])/;
const SUBTYPE_NAME = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}(?![\s\S])/;
const SUFFIX = /^[A-Za-z0-9!#$&^_.-]*(?![\s\S])/;
const MEDIA_TYPE = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *(?![\s\S])/;

function test(value) {
  if (typeof value !== 'string') throw new TypeError('media type must be a string');
  // Validate the original ASCII spelling; Unicode lowercasing can turn K into k.
  return MEDIA_TYPE.test(value);
}

function parse(value) {
  if (typeof value !== 'string') throw new TypeError('media type must be a string');
  const match = MEDIA_TYPE.exec(value);
  if (!match) throw new TypeError('invalid media type');
  const type = match[1].toLowerCase();
  const fullSubtype = match[2].toLowerCase();
  const plus = fullSubtype.lastIndexOf('+');
  return {
    type,
    subtype: plus === -1 ? fullSubtype : fullSubtype.slice(0, plus),
    suffix: plus === -1 ? undefined : fullSubtype.slice(plus + 1),
  };
}

function format(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('media type must be an object');
  }
  const { type, subtype, suffix } = value;
  if (typeof type !== 'string' || !TYPE_NAME.test(type)) throw new TypeError('invalid type');
  if (typeof subtype !== 'string' || !SUBTYPE_NAME.test(subtype)) throw new TypeError('invalid subtype');
  let fullSubtype = subtype;
  if (suffix != null) {
    if (typeof suffix !== 'string' || suffix.length > 125 || !SUFFIX.test(suffix)) throw new TypeError('invalid suffix');
    // A present empty suffix retains the trailing + accepted by parse/test.
    fullSubtype += '+' + suffix;
  }
  if (fullSubtype.length > 127) throw new TypeError('subtype exceeds 127 characters');
  return type + '/' + fullSubtype;
}

exports.parse = parse;
exports.format = format;
exports.test = test;
Object.freeze(exports);
