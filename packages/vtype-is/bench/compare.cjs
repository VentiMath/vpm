'use strict';
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [];
for (const [name, inputs, pattern] of [
  ['is extension', ['text/html', 'application/json; charset=utf-8'], ['html', 'json']],
  ['is exact', ['application/json', 'application/json; charset=utf-8'], ['application/json']],
  ['is wildcard', ['text/html', 'application/json'], ['*/*']],
  ['is suffix', ['application/problem+json', 'application/vnd.foo+bar+json'], ['+json']],
  ['is unmatched', ['image/png', 'application/xml'], ['html', 'json']],
  ['is invalid', ['text/@bad', 'missing-slash'], ['*/*']],
]) cases.push({ name, inputs, before: value => upstream.is(value, pattern), after: value => vpm.is(value, pattern) });
cases.push({ name: 'request', inputs: [
  { headers: { 'content-length': '10', 'content-type': 'application/json' } },
  { headers: { 'transfer-encoding': 'chunked', 'content-type': 'application/json; charset=utf-8' } },
], before: request => upstream(request, ['json']), after: request => vpm(request, ['json']) });
cases.push({ name: 'hasBody', inputs: [{ headers: { 'content-length': '0' } }, { headers: {} }], before: upstream.hasBody, after: vpm.hasBody });
cases.push({ name: 'match', inputs: ['text/html', 'application/json'], before: actual => upstream.match('*/*', actual), after: actual => vpm.match('*/*', actual) });
compare(cases);
