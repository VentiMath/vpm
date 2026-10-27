'use strict';
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [];
for (const [name, method, field, header, available, options] of [
  ['media short', 'mediaTypes', 'accept', 'text/html, application/json;q=0.5', ['text/html', 'application/json']],
  ['media parameter', 'mediaTypes', 'accept', 'application/json;profile="a,b";q=0.9, text/html;q=0.5', ['text/html', 'application/json;profile="a,b"']],
  ['media 16x16', 'mediaTypes', 'accept', Array.from({ length: 16 }, (_, i) => 'application/x-' + i + ';q=' + (1 - i / 20).toFixed(2)).join(','), Array.from({ length: 16 }, (_, i) => 'application/x-' + i)],
  ['media list', 'mediaTypes', 'accept', 'text/html;q=0.8, application/json, text/plain;q=0.5', undefined],
  ['media absent', 'mediaTypes', 'accept', undefined, ['text/html', 'application/json']],
  ['encodings', 'encodings', 'accept-encoding', 'gzip;q=0.5, br, identity;q=0.1', ['gzip', 'br', 'identity']],
  ['encoding preference', 'encodings', 'accept-encoding', 'gzip, br', ['gzip', 'br', 'identity'], { preferred: ['br', 'gzip'] }],
  ['languages', 'languages', 'accept-language', 'en-US;q=0.8, fr;q=0.9, de;q=0.5', ['en', 'en-US', 'fr', 'de-DE']],
  ['charsets', 'charsets', 'accept-charset', 'utf-8, iso-8859-1;q=0.5', ['utf-8', 'iso-8859-1']],
]) {
  const inputs = [{ headers: { [field]: header } }];
  cases.push({ name, inputs, before: req => upstream(req)[method](available, options).join('|'), after: req => vpm(req)[method](available, options).join('|') });
}
compare(cases);
