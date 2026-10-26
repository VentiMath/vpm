'use strict';
const compare = require('../../../scripts/compare.cjs');
const fresh = require('..');
const before = require('../test/fixtures/fresh-2.0.0.cjs');
const tags = Array.from({ length: 32 }, (_, i) => '"tag-' + i + '"').join(', ');
compare([
  ['single matching tag', { 'if-none-match': '"tag-31"' }],
  ['32 tags, last matches', { 'if-none-match': tags }],
  ['32 tags, no match', { 'if-none-match': tags.replace('tag-31', 'absent') }],
  ['cache-control no-cache', { 'if-none-match': '*', 'cache-control': 'public, no-cache' }],
  ['modified-since', { 'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT' }],
].map(([name, input]) => ({ name, inputs: [input], before: value => before(value, { etag: '"tag-31"', 'last-modified': 'Tue, 20 Oct 2015 07:28:00 GMT' }),
  after: value => fresh(value, { etag: '"tag-31"', 'last-modified': 'Tue, 20 Oct 2015 07:28:00 GMT' }) })));
