# vjson-bigint

Exact JSON numbers without an arithmetic dependency. A counterpart to
`json-bigint` 1.0.0 for Node 24+ and Bun, with CommonJS, native ESM default import
and TypeScript declarations.

```js
const JSONBig = require('vjson-bigint');
const data = JSONBig.parse('{"id":9223372036854775807}');
data.id.valueOf(); // '9223372036854775807'
JSONBig.stringify(data); // '{"id":9223372036854775807}'
JSONBig({useNativeBigInt: true}).parse('9223372036854775807'); // 9223372036854775807n
```

`JSONBig(options)` returns an immutable `{parse, stringify}` codec. The default
export also provides both methods, `ExactNumber`, and `isExactNumber(value)`.
Objects parsed from JSON have null prototypes. Revivers run after parsing;
serializers support replacer functions/lists, indentation, `toJSON`, boxed
primitives, native bigints and circular-reference errors.

## Exact values and compatibility

Safe integers remain numbers, including 16-digit safe integers. Other literals
remain numbers only when decimal normalization of their number representation
matches the input. Unsafe integers, inexact decimals, overflow and underflow use
an immutable `ExactNumber`. It preserves the original numeric spelling through
`toString()`, `valueOf()` and this codec's serializer. Its `toJSON()` returns a
string for ordinary `JSON.stringify` compatibility.

**ExactNumber does not implement BigNumber arithmetic.** Callers needing arithmetic
must explicitly convert to an appropriate numeric library. The inspected Google
metadata callers use string conversion; CloudEvents uses native bigint mode.

`useNativeBigInt` converts exact integer values to native bigints, including
integer exponents when expansion fits `maxNumberLength`. Fractional exact values
remain `ExactNumber` instead of throwing. `storeAsString` takes precedence and
preserves numeric spelling. `alwaysParseAsBig` applies that policy to all numbers.
A replacer receives an exact wrapper directly; returning a string quotes it as a
string, avoiding the upstream raw-number replacement injection. Third-party
BigNumber values are ordinary objects and follow their own `toJSON` methods.

JSON number/string/whitespace syntax is strict. `strict: true` additionally rejects
duplicate decoded object keys. `protoAction` and `constructorAction` accept
`error` (default), `ignore`, or `preserve`, matching only the complete decoded
property name. Syntax errors are real `SyntaxError` instances with a numeric
`position`, no input copy, and no untrusted source in their message.

## Bounds

| Option | Default | Maximum |
| --- | ---: | ---: |
| `maxLength` (input UTF-16 code units) | 16,777,216 | 1,073,741,823 |
| `maxDepth` (nested containers, parse and stringify) | 512 | 1,024 |
| `maxNumberLength` (literal characters / expanded integer digits) | 100,000 | 100,000 |

Limits must be positive safe integers. `ExactNumber` construction always permits
at most 100,000 characters and accepts only a complete JSON numeric literal.
These limits do not bound total serialized output or execution of user callbacks.
Serialization state is per call, so recursive calls from getters/replacers do not
corrupt an outer operation. Native JSON intrinsics are captured at module load
because CloudEvents can replace global `JSON`.

## Verification

Seventeen focused tests include 1,000 generated native-JSON comparisons. All 18
upstream tests run from a hash-checked source archive, with explicit adaptations
for ExactNumber identity and sanitized error messages. The integration gate drives
CloudEvents' actual bigint parser; package archives are installed through npm and
Bun and checked with CJS, ESM and TypeScript consumers.

See [benchmark evidence](bench/results/README.md),
[provenance](PROVENANCE.json), and [central improvements](../../IMPROVEMENTS.md).
