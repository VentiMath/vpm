# vlong

Signed and unsigned 64-bit integers based on **long 5.3.2**, with strict text
parsing, faster string conversion and protection against shared-value mutation.
Zero runtime dependencies, as upstream already has. Supports Node 24+ and Bun.

```js
import Long from 'vlong';

const value = Long.fromString('18446744073709551615', true);
value.toString(); // '18446744073709551615'
value.add(1).toString(); // '0' — unsigned 64-bit wrapping
Long.fromBigInt(9007199254740993n).toBytesLE();
```

CommonJS uses `require('vlong')`; both entry points share one constructor. The
included declarations need no ambient Node, Undici or DOM types.

## Improvements

- Text parsing validates the entire string and radix. Decimal prefixes followed
  by junk, invalid interior chunks, whitespace and fractional radices throw.
- Short decimals use exact Number arithmetic. Other decimals use bounded native
  BigInt conversion; nondecimal strings combine validation with exact two-word
  accumulation. Arbitrarily long strings wrap without unbounded BigInts.
- String formatting uses native Number/BigInt conversion instead of repeated
  Long division and intermediate objects.
- `fromInt` returns independent mutable values. Mutating a small integer can no
  longer poison another caller through upstream's shared cache.
- Shared constants are frozen and their constructor properties cannot be
  reassigned. Ordinary constructed values remain mutable for protobuf callers.
- Byte constructors require exactly eight valid bytes and support sliced
  Uint8Arrays, including Buffers. Array elements are read once and must be integers from 0 to 255; custom
  iterators cannot bypass validation. Cross-realm Uint8Arrays are supported.

The existing word arithmetic and optional WebAssembly multiplication/division
remain. The fallback is checked independently with WebAssembly disabled.

## Compatibility and migration

The 5.3.2 arithmetic, comparison, bitwise, shift/rotate, byte conversion, BigInt
conversion and alias APIs remain, including `low`, `high` and `unsigned` fields.
Overflow wraps modulo 2^64. `fromNumber` preserves upstream clamping and truncation;
use strings or BigInts when a Number cannot represent an integer exactly.

Intentional input and mutability differences:

| Behavior | VPM contract |
| --- | --- |
| Integer text | Optional single `+`/`-`, then ASCII digits valid for the radix; no spaces, separators or automatic radix-prefix interpretation |
| Radix | Integer number 2–36, default 10 only when omitted/undefined; the numeric second-argument overload remains |
| Byte input | Exactly eight bytes in a number array or Uint8Array; no silent padding, truncation or invalid-byte coercion |
| Small integers | `fromInt` calls return separate objects, without identity caching |
| Shared constants | `ZERO`, `UZERO`, `ONE`, `UONE`, `NEG_ONE`, `MIN_VALUE`, `MAX_VALUE`, `MAX_UNSIGNED_VALUE` are immutable |

Decimal fractions, exponent syntax and `NaN`/`Infinity` strings throw. Letters
remain ordinary digits in bases that allow them, such as `1e3` in base 16.

Some existing arithmetic/clamping paths return those shared constants, so their
results can also be frozen. Use `Long.fromValue(result)` to obtain a mutable
copy. Arbitrary objects accepted by upstream's structural `isLong`/`fromValue`
remain supported; these are not general object-validation APIs. Instance
methods and the prototype are not frozen.

## Evidence

On Node 24 and Bun:

- All **175 unchanged upstream/Closure cases** and the upstream CommonJS entry
  checks pass, with the original implementation as a control.
- Ten focused tests cover an independent BigInt oracle, all radices, boundary
  wrapping, 10,000-digit input, disabled WebAssembly, malformed inputs, mutation
  isolation, typed-array slices and CommonJS/ESM identity.
- Seven paired correction probes fail on upstream and pass on VPM.
- Sixteen real caller paths verify protobuf.js **8.8.1** and **7.6.6**, gRPC
  proto-loader **0.8.1**, and google-gax **6.14.0** gRPC/fallback definitions.
  Exact wire bytes, signed/unsigned limits, timestamps, map keys, JSON strings
  and defaults are checked. This verifies integer conversion, not the full SDK.
- Packed npm/Bun installations and public type consumers are checked.

See the [comparison fixture](../../scripts/long-conformance/README.md) and
[benchmarks](bench/results/README.md), including remaining costs and controls.

## Provenance

Derived from [long 5.3.2](https://github.com/dcodeIO/long.js/tree/e1bcb4f65096465b69f0fd67e68fc2a79a67ade9).
The Apache 2.0 [license](LICENSE), Closure and long.js attribution are retained.
[PROVENANCE.json](PROVENANCE.json) records the upstream commit and npm integrity.
