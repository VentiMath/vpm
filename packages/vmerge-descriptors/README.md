# vmerge-descriptors

A replacement for `merge-descriptors` 2.0.0 that includes symbol properties,
validates inputs explicitly, and preserves native descriptor semantics. Zero
runtime dependencies, CommonJS and native ESM imports, and self-contained
TypeScript declarations. Express uses this utility to build application functions.

```js
const merge = require('vmerge-descriptors');
// Also: import merge from 'vmerge-descriptors';

const key = Symbol('metadata');
const source = Object.defineProperties({}, {
  hidden: { value: 42, enumerable: false },
  [key]: { get() { return this.hidden; }, enumerable: false },
});
const destination = merge({}, source);
destination[key]; // 42; the getter was not called during the merge

merge({ value: 1 }, { value: 2 }, false); // preserves value: 1
```

## API and improvements

`merge(destination, source, overwrite = true)` copies own property descriptors
and returns `destination`. Both endpoints must be non-null objects or functions;
`overwrite` must be a boolean (omitting it or passing undefined selects true).
Arrays, null-prototype objects and callable destinations work with normal native
property-definition behavior. With `overwrite: false`, existing **own** keys are
preserved; inherited keys do not prevent copying.

- **Symbols included.** `Reflect.ownKeys` enumerates string and symbol keys in one
  pass, including nonenumerable properties. Upstream silently omits symbols.
- **Explicit contracts.** Primitives and nonboolean overwrite values throw a
  TypeError before copying, instead of being boxed, ignored or interpreted by
  truthiness. This intentionally tightens upstream's accepted inputs.
- **Disappearing keys.** A source key removed after enumeration is skipped. An
  inherited replacement is never copied. Upstream throws when handed the missing
  descriptor in this situation.

Both versions preserve getters/setters without evaluating them, property flags,
shallow object references, and safe descriptor-based handling of `__proto__`.
These inherited strengths are not claimed as new fixes. This operation does not
clone values or prototypes. Copying properties from a function into an object does
not make the object callable.

The merge is **not atomic**: a nonconfigurable conflict, nonextensible destination,
or throwing proxy trap can leave earlier properties copied. Native proxy traps
and definition errors remain observable. The key list is captured once, while
descriptors are read when each key is reached; this is not a transactional snapshot.
With overwrite false, a preserved destination key also skips reading the source's
descriptor.

Types describe ordinary resulting object shapes: source property types win by
default, destination types win with false, and a dynamic boolean yields a union.
The destination's final call/construct signature is retained. Types cannot model
own versus inherited keys, proxy effects or changes to other aliases of the
mutated destination; overloaded/generic signatures and exotic descriptor changes
can require an explicit application type.

## Verification

14 focused tests cover exact descriptor preservation, accessor non-execution,
enumerable and nonenumerable symbols, overwrite modes, inherited keys,
null-prototype objects and `__proto__`, functions, arrays, self-merges, invalid
inputs, native failures and partial progress, disappearing keys, proxy trap order,
CJS/ESM imports and 1,000 generated descriptor comparisons.

The shared gate passes **160 HTTP checks** on Node 24.22.1 and Bun 1.4.0 with VPM
aliased into real Express/Functions Framework callers. Express application
construction also preserves a nonenumerable symbol getter without invoking it.
Packed archives pass npm/Bun installation, Node/Bun CJS/ESM consumers and strict
TypeScript 7.0.2 without Node, Undici or DOM ambient types.

```sh
node --test packages/vmerge-descriptors/test/*.test.cjs
bun test packages/vmerge-descriptors/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

## Benchmarks

Recorded 2026-10-27 on macOS arm64, Node 24.22.1 and Bun 1.4.0, against the
unmodified 2.0.0 fixture. Nine alternating-order samples, corpus/case warmup,
equal-output checks and consumed results. Medians below are nanoseconds per
operation, lower is better. Most cases use 50,000 operations per sample;
100-property merges and 50-method function mixins use 5,000. Sources contain only
string keys so both implementations perform the same requested merge. Symbol
support is tested separately, not presented as a speed comparison with an
implementation that omits those properties.

Bun stays within roughly **6% of upstream** on nonempty cases. Node takes
**10–26% more time** on ordinary nonempty copies, while the Express-like function
mixin is essentially equal. Empty merges and skipping 20 existing fields are
**2.9× and 3.5× upstream on Node**, adding about 36 ns and 647 ns respectively.
Complete key enumeration and validation have a cost; no general speedup or
application throughput improvement is claimed.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| merge 0 data properties | 18 → 54 | 23 → 20 |
| merge 3 data properties | 477 → 601 | 300 → 317 |
| merge 20 data properties | 3112 → 3672 | 1594 → 1602 |
| merge 100 data properties | 25411 → 29460 | 7354 → 7265 |
| merge accessors and hidden fields | 705 → 774 | 227 → 228 |
| skip 20 existing fields | 263 → 909 | 51 → 49 |
| replace 20 existing fields | 2762 → 3323 | 1300 → 1307 |
| mix 50 methods into a function | 13101 → 13113 | 4269 → 4244 |

[Harness](bench/compare.cjs), [Node samples](bench/node24.json), and
[Bun samples](bench/bun14.json) contain all samples, runtime versions, source and
fixture hashes, counts and checksums. Reproduce sequentially:

```sh
OUTPUT=/tmp/vmerge-node.json node packages/vmerge-descriptors/bench/compare.cjs
OUTPUT=/tmp/vmerge-bun.json bun packages/vmerge-descriptors/bench/compare.cjs
```

## Distribution and provenance

Node.js 20+ package baseline; local verification uses Node 24 and Bun. Install
from the workspace or run `bun pm pack --ignore-scripts` in
`packages/vmerge-descriptors`, then install the resulting archive with npm or Bun.
These packages are not yet published to npm. Archives include only source,
declarations, metadata, README, license and provenance.

Derived from [merge-descriptors](https://www.npmjs.com/package/merge-descriptors)
under MIT. Original notices remain in [LICENSE](LICENSE).
[Provenance](PROVENANCE.json) records the release commit, archive integrity and
SHA-256 fixture hash. The unmodified comparison fixture was extracted only after
verifying the published archive's SHA-512 integrity; its license is preserved
beside it. Tests and benchmarks are excluded from installable archives.
