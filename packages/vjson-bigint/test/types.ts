import JSONBig = require('..');
const codec: JSONBig.Codec = JSONBig({strict: true, useNativeBigInt: true, protoAction: 'preserve', maxDepth: 32});
const exact = new JSONBig.ExactNumber('9007199254740993');
const value: unknown = codec.parse('{"id":9007199254740993}', function(key, value) { return key ? value : this[key]; });
if (JSONBig.isExactNumber(value)) { const text: string = value.valueOf(); void text; }
const text: string | undefined = codec.stringify({exact}, ['exact', 1], 2);
const replaced: string | undefined = JSONBig.stringify(value, (key, value) => key ? value : exact);
// @ts-expect-error policy names are checked
JSONBig({protoAction: 'permit'});
// @ts-expect-error only numeric source strings construct exact values
new JSONBig.ExactNumber(123);
void [text, replaced];
