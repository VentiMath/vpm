'use strict';
const compare = require('../../../scripts/compare.cjs');
const upstream = require('../test/fixtures/statuses-2.0.2');
const replacement = require('..');
compare([
  { name: 'numeric code', before: upstream, after: replacement, inputs: upstream.codes },
  { name: 'numeric string', before: upstream, after: replacement, inputs: upstream.codes.map(String) },
  { name: 'reason phrase', before: upstream, after: replacement, inputs: Object.values(upstream.message) },
  { name: 'direct message table', before: code => upstream.message[code], after: code => replacement.message[code], inputs: upstream.codes },
]);
