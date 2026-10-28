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

- **Symbols included.** Both string and symbol keys are captured before copying,
  including nonenumerable properties. Upstream silently omits symbols. Ordinary
  Node objects use separate name/symbol enumeration; proxies retain one
  `Reflect.ownKeys` call and its original order. Bun uses `Reflect.ownKeys`
  throughout. Built-in `node:util.types.isProxy` distinguishes the proxy path;
  this adds no external package dependency.
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

17 focused tests cover exact descriptor preservation, accessor non-execution,
enumerable and nonenumerable symbols, overwrite modes, inherited keys,
null-prototype objects and `__proto__`, functions, arrays, self-merges, invalid
inputs, native failures and partial progress, disappearing keys, proxy trap order,
interleaved proxy symbols, revoked proxies, symbol snapshots before destination
traps, overlapping typed-array views, CJS/ESM imports and 1,000 generated descriptor comparisons.

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

Updated 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0. Three fresh
processes per runtime compare unmodified upstream 2.0.0, the exact
[previous VPM source](bench/vmerge-descriptors-7744a9e.cjs) from commit `7744a9e`,
and current VPM. Each case has twelve samples rotating through all six
implementation orders, corpus/case warmup, equal-output checks and consumed
results. Most cases use 50,000 operations per sample; 100-property merges and
50-method mixins use 5,000, mixed-symbol/proxy cases 10,000. Symbol cases compare
only VPM versions because upstream omits those keys.

Node's previous `Reflect.ownKeys` path paid for general enumeration even when
copying ordinary string-only objects. `Object.getOwnPropertyNames` can use a
faster path there. The new path also captures symbols before copying and keeps
proxy enumeration unchanged. Both built-ins run before descriptor reads or
writes. Bun retains its native combined enumeration, which already performed well.
The copy loop stays sequential; batching descriptors could change behavior for
overlapping typed-array views or source mutations caused by destination proxies.

Across all three Node runs, string data copies, replacement and the Express-like
function mixin take **7–19% less time** than previous VPM. Skipping 20 existing
fields takes **63–65% less**, and empty merges **13–19% less**. Compared with
upstream, string data copies are now about **1–9% slower**, the function mixin
**1–2% slower**, and skipping existing fields **17–18% slower**. Empty merges still
cost about 2.4–2.6× upstream, an extra few dozen nanoseconds.

There are measured tradeoffs: Node's accessor/nonenumerable case takes **5–7% more
time than previous VPM** (about 43 ns in run 1); all-symbol copies take **4–11% more**
and mixed string/symbol copies **2–8% more**. Splitting enumeration costs extra on
these shapes; validation and complete symbol support remain in place. The proxy
path stays within about 4% of previous VPM. Bun's nonempty cases stay within about
2%; empty cases vary by a few nanoseconds. These are individual-operation
measurements, not application throughput claims.

First-run medians in nanoseconds per operation:

| Case | Node previous → current | Bun previous → current |
| --- | ---: | ---: |
| merge 0 data properties | 50 → 40 | 15 → 17 |
| merge 3 data properties | 567 → 483 | 216 → 213 |
| merge 20 data properties | 3510 → 3027 | 1481 → 1477 |
| merge 100 data properties | 26490 → 23483 | 7349 → 7380 |
| merge accessors and hidden fields | 639 → 682 | 230 → 232 |
| skip 20 existing fields | 718 → 265 | 42 → 40 |
| replace 20 existing fields | 3130 → 2642 | 1241 → 1252 |
| mix 50 methods into a function | 12619 → 10912 | 4132 → 4179 |
| merge 20 symbol properties | 3908 → 4316 | 1457 → 1476 |
| merge 20 strings and 20 symbols | 9393 → 10182 | 3094 → 3083 |
| merge 20 properties from a proxy | 5654 → 5833 | 1628 → 1624 |

[Harness](bench/compare.cjs), [Node run 1](bench/node24.json),
[run 2](bench/node24-repeat2.json), [run 3](bench/node24-repeat3.json),
[Bun run 1](bench/bun14.json), [run 2](bench/bun14-repeat2.json) and
[run 3](bench/bun14-repeat3.json) retain all samples, upstream/previous/current
medians, versions, hashes, counts and checksums. Original release measurements
remain in [commit 7744a9e](https://github.com/VentiMath/vpm/blob/7744a9ee18a03ea3720a940b660990eb9727c913/packages/vmerge-descriptors/README.md).
Reproduce sequentially, using fresh processes for repeats:

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
