'use strict';
const path = require('node:path');
const compare = require('../../../scripts/compare.cjs');
const load = require('../test/load.cjs');
const upstreamSetup = load(path.join(__dirname, '../test/fixtures/debug-4.4.3/common.js'), { ms: require('../test/fixtures/ms-2.1.3.cjs') });
const replacementSetup = require('../common');
function environment() {
  return { colors: [1], useColors: () => false, formatArgs() {}, log() {}, save() {}, load() {}, destroy() {} };
}
const upstream = upstreamSetup(environment()), replacement = replacementSetup(environment());
const inputs = Array.from({ length: 32 }, (_, i) => 'app:handler:' + i);
const cases = [];
for (const [name, pattern, values] of [
  ['prefix wildcard', 'app:*', inputs],
  ['middle wildcard', 'app:*:handler*', inputs],
  ['excluded namespace', 'app:*,-app:handler:*', inputs],
  ['repeated-prefix failure', '*aaaaaaaab*tail', Array.from({ length: 32 }, (_, i) => 'a'.repeat(64 + i) + 'tail')],
]) {
  const a = upstreamSetup(environment()), b = replacementSetup(environment());
  a.enable(pattern); b.enable(pattern);
  cases.push({ name, before: a.enabled, after: b.enabled, inputs: values });
}
const disabledOld = upstream('disabled'), disabledNew = replacement('disabled');
cases.push({ name: 'cached disabled call', before: n => { disabledOld('value %s', n); return 0; }, after: n => { disabledNew('value %s', n); return 0; }, inputs });
function enabledCall(setup) {
  const debug = setup(environment()); debug.enable('enabled'); const log = debug('enabled');
  let length = 0; log.log = (...args) => { length = args[0].length + args[1].length; };
  return value => { log('value %s', value); return length; };
}
cases.push({ name: 'enabled call, no I/O', before: enabledCall(upstreamSetup), after: enabledCall(replacementSetup), inputs });
const configurations = Array.from({ length: 32 }, (_, i) => Array.from({ length: 10 }, (_, j) => 'app' + i + ':' + j + ':*').join(','));
cases.push({ name: 'configure 10 patterns', before: text => { upstream.enable(text); return upstream.names.length; }, after: text => { replacement.enable(text); return replacement.names.length; }, inputs: configurations });
compare(cases);
