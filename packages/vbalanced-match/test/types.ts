import match = require('../index.cjs');
const result: match.Match | undefined = match('{', '}', 'a{b}c');
const pair: [number, number] | undefined = match.range('{', '}', '{x}');
const regex: match.Match | undefined = match.balanced(/a/, /z/, 'a123z');
void [result, pair, regex];
// @ts-expect-error A delimiter must be a string or RegExp.
match(1, '}', '{}');
