# vlodash.camelcase

Camel-case conversion compatible with **lodash.camelcase 4.3.0**, with a direct
path for ASCII identifiers used by gRPC and Google SDKs. Zero runtime
dependencies. Node 24+, Bun, and browser bundles are supported; CommonJS, native
ESM default imports and self-contained TypeScript declarations are included.

```js
import camelCase from 'vlodash.camelcase';

camelCase('GetIamPolicy');     // 'getIamPolicy'
camelCase('XMLHttpRequest');   // 'xmlHttpRequest'
camelCase('get_v2_URL');       // 'getV2Url'
camelCase('déjà vu');          // 'dejaVu'
```

CommonJS uses `require('vlodash.camelcase')`. The optional argument accepts any
value; null and undefined produce an empty string. Strings follow the standalone
4.3.0 package's rules, which are not identical to every later monolithic Lodash
release. In particular, `24th value` becomes `24ThValue`.

## Changes

- Ordinary ASCII camel/Pascal identifiers return directly or lowercase their
  initial letter. Other ASCII names use compact word matching, without loading
  Unicode tables. There is no result cache or input-size cutoff.
- Unicode processing retains the original Latin-1/Extended-A mappings, word
  boundaries, emoji sequences and grapheme-aware capitalization. It loads on
  the first non-ASCII input. General Unicode normalization would change this
  contract and is deliberately avoided.
- Redundant lowercasing and whole-word symbol arrays are removed. Global discovery
  no longer uses `Function`; browser bundles work with string code generation
  disabled and without Node globals.
- Zero BigInts and boxed zero BigInts produce `'0'` instead of throwing from
  upstream's mixed numeric division. Object coercion uses the default hint once;
  upstream can invoke a zero-valued object's conversion a second time.
- Boxed Symbols are recognized by their intrinsic brand. An ordinary object's
  `Symbol.toStringTag` is not read or mistaken for a real Symbol. User conversion
  exceptions still propagate. Non-string inputs are supported for compatibility;
  the optimized caller path is string identifiers.

This is a formatting function, not a unique identifier generator or sanitizer.
Different inputs can intentionally map to the same name, as upstream does.

## Verification

The [comparison fixture](../../scripts/camelcase-conformance/README.md) runs
347,735 exact comparisons against the pinned 4.3.0 package, including every BMP
code unit, exhaustive short ASCII boundaries, seeded astral/Unicode sequences
and ordinary coercions. Two unchanged canonical Lodash camelCase tests add twelve
assertions per implementation. The three coercion fixes have upstream controls.

Eighteen focused tests cover the public API and intentional differences. Actual
`@grpc/proto-loader` 0.8.1 and google-gax 6.14.0 preserve 13 synthetic RPC aliases,
wire serialization and generated client methods; Firestore 9.4.0 supplies 17 real
methods. Import instrumentation verifies 43 calls, and a separate run combines
the replacement with `vprotobufjs`. No SDK source files are changed.

```sh
node --test packages/vlodash.camelcase/test/*.test.cjs
bun test packages/vlodash.camelcase/test
npm --prefix scripts/camelcase-conformance ci --ignore-scripts
npm --prefix scripts/protobuf-conformance ci --ignore-scripts
node scripts/camelcase-conformance/run.cjs
node scripts/camelcase-conformance/callers.cjs
node scripts/camelcase-conformance/callers.cjs --upstream
node scripts/camelcase-conformance/callers.cjs --stack
node scripts/camelcase-conformance/bundles.cjs
```

CI runs the comparisons on Node 24 and Bun, plus installed npm/Bun archive and
TypeScript 7 checks. Browser bundles run in a VM without Node globals and with
string code generation disabled.

[Paired benchmarks](bench/results/README.md) show short PascalCase RPC conversion
taking 83% less time on Node 24 and 87% less on Bun; already-camelCase names take
91% and 94% less. A real 13-method gRPC loader improves about 7% on each runtime.
Full Firestore schema loading remains inconclusive within measurement variation;
these results do not establish an application-level speedup.

[Provenance](PROVENANCE.json) records the exact source hash,
version and changes; the upstream MIT [license](LICENSE) is retained. Test tools,
upstream fixtures and benchmark reports are excluded from package archives.
