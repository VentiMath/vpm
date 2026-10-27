import qs, { parse, stringify, formats } from 'vqs';
const options: qs.ParseOptions = { depth: 5, parameterLimit: 100, strictDepth: true, throwOnLimitExceeded: true };
const parsed: qs.ParsedObject = parse('a[b]=x', options);
const value: qs.ParsedValue = parsed.a;
const query: string = stringify({ a: ['é', 'b'] }, { arrayFormat: 'repeat', format: formats.WHATWG });
const numeric: qs.ParsedObject<string | number> = parse('a=1', {
  decoder(value, decode, charset, kind) { return kind === 'key' ? decode(value, decode, charset) : Number(value); },
});
const filtered: string = stringify({}, { filter: Object.freeze(['a', 1]), encoder(value, encode, charset, kind, format) {
  return encode(value, encode, charset, kind, format);
} });
const copied: qs.ParsedObject<unknown> = parse({ a: new Date() });
stringify({}, { encoder: (value, encode) => encode(value), sort: (a, b) => a.localeCompare(b) });
stringify({}, { filter: [1, 'a'], sort: (a, b) => String(a).localeCompare(String(b)) });
parse('', { depth: false });
// @ts-expect-error numeric limits are numbers, not strings
parse('a=1', { parameterLimit: '100' });
// @ts-expect-error stringify depth cannot be false
stringify({}, { depth: false });
// @ts-expect-error format is a supported literal
stringify({}, { format: 'WHAT-EVER' });
// @ts-expect-error parsed fields are not guaranteed to be strings
const bad: string = parsed.a;
// @ts-expect-error a custom decoder may change the value type
const decodedAsText: qs.ParsedObject = parse('a=1', { decoder: () => 1 });
void [value, query, numeric, filtered, copied, bad, decodedAsText];
