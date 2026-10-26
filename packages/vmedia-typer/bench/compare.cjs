'use strict';
const upstream = require('../test/fixtures/media-typer-1.1.1.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [];
for (const [name, inputs] of [
  ['test lowercase', ['text/html', 'application/json']],
  ['test uppercase', ['TEXT/HTML', 'APPLICATION/JSON']],
  ['test long subtype', ['application/' + 'x'.repeat(120)]],
  ['test invalid', ['text/@bad', 'missing-slash']],
]) cases.push({ name, inputs, before: upstream.test, after: vpm.test });
for (const [name, inputs] of [
  ['parse short', ['text/html', 'application/json']],
  ['parse suffix', ['application/vnd.example+json', 'image/svg+xml']],
  ['parse mixed case', [' Text/HTML ', ' Application/Problem+JSON ']],
]) {
  const parse = api => value => { const result = api.parse(value); return result.type + '/' + result.subtype + ':' + result.suffix; };
  cases.push({ name, inputs, before: parse(upstream), after: parse(vpm) });
}
cases.push({ name: 'format', inputs: [{ type: 'text', subtype: 'html' }, { type: 'application', subtype: 'problem', suffix: 'json' }], before: upstream.format, after: vpm.format });
compare(cases);
