'use strict';
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [];
for (const [encoding, text] of [
  ['utf8', 'Hello café 世界 💩'], ['utf16le', 'Hello café 世界 💩'],
  ['utf16be', 'Hello café 世界 💩'.repeat(64)], ['utf32be', 'Hello café 世界 💩'.repeat(64)],
  ['windows1251', 'Привет мир'.repeat(32)], ['gb18030', '你好 世界 💩'.repeat(32)],
]) {
  cases.push({ name: encoding + ' encode', inputs: [text], before: value => upstream.encode(value, encoding), after: value => vpm.encode(value, encoding) });
  cases.push({ name: encoding + ' decode', inputs: [upstream.encode(text, encoding)], before: value => upstream.decode(value, encoding), after: value => vpm.decode(value, encoding) });
}
cases.push({ name: 'alias lookup', inputs: ['UTF-16LE', 'windows-1251', 'Shift_JIS'], before: value => upstream.encodingExists(value), after: value => vpm.encodingExists(value) });
// Consume byte results without adding a hex conversion to the measured work.
for (const entry of cases) if (entry.name.endsWith('encode')) {
  const before = entry.before, after = entry.after;
  for (const input of entry.inputs) require('node:assert/strict').deepEqual(after(input), before(input));
  entry.before = input => { const bytes = before(input); return bytes.length + bytes[0]; };
  entry.after = input => { const bytes = after(input); return bytes.length + bytes[0]; };
}
compare(cases);
