'use strict';
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [];
for (const [name, method, field, header, available] of [
  ['extensions', 'types', 'accept', 'text/html;q=0.5, application/json', ['html', 'json']],
  ['explicit media', 'types', 'accept', 'text/html;q=0.5, application/json', ['text/html', 'application/json']],
  ['absent Accept', 'types', 'accept', undefined, ['html', 'json']],
  ['quoted profile', 'types', 'accept', 'application/json;profile="a,b", text/html;q=0.5', ['html', 'application/json;profile="a,b"']],
  ['encodings', 'encodings', 'accept-encoding', 'gzip;q=0.5, br', ['gzip', 'br', 'identity']],
  ['languages', 'languages', 'accept-language', 'en-US;q=0.8, fr', ['en', 'en-US', 'fr']],
  ['charsets', 'charsets', 'accept-charset', 'utf-8, iso-8859-1;q=0.5', ['utf-8', 'iso-8859-1']],
]) cases.push({ name, inputs: [{ headers: { [field]: header } }], before: req => upstream(req)[method](available), after: req => vpm(req)[method](available) });
compare(cases);
