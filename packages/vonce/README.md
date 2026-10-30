# vonce

A replacement for `once` 1.4.0 with private call state, safe callback metadata,
self-contained TypeScript declarations, and zero runtime dependencies. It removes
`wrappy` 1.0.2. Express 5 uses this helper for its `app.listen()` callback.

```js
const once = require('vonce');
// Also: import once, { strict, proto } from 'vonce';

const initialize = once(() => ({ ready: true }));
initialize.called; // false
const result = initialize();
initialize() === result; // true
initialize.called; // true
initialize.value === result; // true

const submit = once.strict(() => 'submitted');
submit(); // 'submitted'
// submit(); // throws on every subsequent call
```

## Contract and improvements

`once(callback)` returns a wrapper that forwards its first call's receiver and
arguments and caches the exact result, including objects and Promises. The
callback counts as called **before it starts**. A reentrant call returns
undefined until the first call finishes. A synchronous exception propagates
unchanged and leaves the wrapper called with an undefined value; later calls
return undefined. A rejected Promise remains the same rejected Promise. There
is no automatic retry or reset.

`once.strict(callback)` has the same first-call behavior, but every repeated or
reentrant call throws a new Error. Its read-only `onceError` contains the error
message based on the callback's name at construction. Callback validation happens
when the wrapper is created.

- **Private state.** Upstream stores its control state in mutable public fields,
  then lets `wrappy` copy callback metadata over them. A callback decorated with
  `called: true` and `value: 'forged'` can therefore never execute. VPM ignores
  these reserved decorations and stores state in closures. Public `called` and
  `value` are enumerable, nonconfigurable read-only accessors, present from
  construction. Freezing a wrapper still permits its callback to run normally.
- **Descriptor-preserving metadata.** Own enumerable string and symbol properties
  are copied without evaluating their getters or invoking the `__proto__` setter.
  `called`, `value`, `onceError`, and the wrapper's own function properties
  (`name`, `length`, `prototype`) are reserved. Other descriptor flags and accessors
  survive; nonenumerable callback decorations do not copy. Native invocation
  still works if the callback has an `apply` decoration. Decorations can shadow
  the returned function's inherited methods, so invoke such wrappers directly.
- **No helper dependency.** Wrapping and decoration handling live together in
  this package; there is no runtime `wrappy` import. The built-in
  `node:util.types.isProxy` selects the safe enumeration path; it is supported by
  both Node and Bun and adds no external package dependency.

These are intentional changes to writable-state and metadata behavior, not
complete behavioral identity with upstream. Code that resets `called`, assigns
`value` or customizes `onceError` must change. Metadata accessors now execute when
read on the wrapper, with the wrapper as their receiver, instead of being evaluated
and flattened at construction. Callable proxies may execute their native property
traps; strict mode also reads the callback's `name` to construct its error text.

`once.proto()` explicitly installs nonenumerable `Function.prototype.once()` and
`onceStrict()` helpers. Importing the package never installs them. Repeating the
installation is harmless, but an existing different own method causes a TypeError
instead of being overwritten. Normal function calls are preferred. TypeScript
users who opt in can explicitly annotate a function as `once.WithPrototype<F>`;
the package does not augment global Function types.

Declarations preserve the receiver, arguments, result and declared metadata of
ordinary callbacks. The normal result includes undefined to account for reentrancy
and previous synchronous failure. Generic/overloaded callback inference uses the
final signature; declarations cannot establish which metadata is enumerable.

## Verification

18 focused tests cover state collisions and tampering, frozen wrappers, receiver
and argument forwarding, returns, reentrancy, exceptions, strict errors, Promise
identity/rejection, accessors, symbols, `__proto__`, invalid callbacks, isolated
prototype installation/conflicts, proxy enumeration/trap order, revoked proxies,
reserved intrinsic decorations, borrowed status getters, CJS/ESM imports and
1,000 generated comparisons.
The shared gate passes HTTP checks on Node 24.22.1 and Bun 1.4.0. Its real
Express `app.listen()` checks include successful startup, a late error after
startup, and EADDRINUSE; state-shaped callback metadata cannot suppress the
callback. Packed archives pass npm/Bun installation, Node/Bun CJS/ESM consumers,
and TypeScript 7.0.2 without Node, Undici or DOM ambient declarations.

```sh
node --test packages/vonce/test/*.test.cjs
bun test packages/vonce/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

Updated 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0. Three fresh
processes per runtime compare unmodified `once` 1.4.0 + `wrappy` 1.0.2, the exact
[previous VPM source](bench/vonce-7744a9e.cjs) from commit `7744a9e`, and current
VPM. Each case has twelve samples, rotating through all six implementation orders,
with corpus/case warmup, equal-result checks and consumed outputs. The upstream
fixture loader uses the same JavaScript realm. Symbol metadata compares only VPM
versions because upstream does not copy it.

The previous implementation enumerated every callback property with
`Reflect.ownKeys`, including built-in and nonenumerable names it would discard.
Ordinary functions now use enumerable string keys plus a symbol snapshot. Callable
proxies keep the original single enumeration and descriptor-read order. Private
closure state and the two read-only status accessors are unchanged.

Across the three runs, the five original construction cases take **10–30% less
time on Node and 19–37% less on Bun** than previous VPM. Retaining wrappers in a
1,024-element ring, so allocation cannot be eliminated, takes **25–35% less on
Node and 34–37% less on Bun**. The 100-hidden-property case takes **about 93% / 92%
less**, while two-symbol metadata saves **4–7% / 3–5%**. Cached-call code is
unchanged: its small timing differences, and strict-error differences, are not
claimed as speedups.

Read-only accessors still cost more to construct than upstream's mutable data
fields. In the first run, ordinary creation plus first call is **451 ns versus
44 ns upstream on Node**, and **215 ns versus 121 ns on Bun**. Eliminating this
remaining gap is not claimed. No call-state protection or descriptor behavior was
removed, and these microbenchmarks do not establish application throughput.

The table shows first-run medians in nanoseconds per operation. Normal cases use
50,000 operations per sample, cached calls 1,000,000 and strict rejections 10,000.
Construction cases include allocation and metadata; repeated-call cases create
their wrappers before timing.

| Case | Node previous → current | Bun previous → current |
| --- | ---: | ---: |
| create wrapper | 596 → 464 | 324 → 208 |
| create and first call | 557 → 451 | 327 → 215 |
| create, first and cached call | 600 → 475 | 329 → 211 |
| create with three metadata fields | 1093 → 984 | 568 → 450 |
| create strict and first call | 728 → 587 | 365 → 252 |
| cached call | 8 → 8 | 9 → 9 |
| cached strict rejection | 4414 → 4439 | 284 → 281 |
| create and retain wrappers | 572 → 371 | 365 → 241 |
| create with 100 hidden metadata fields | 7851 → 512 | 6404 → 535 |
| create with two symbol metadata fields | 884 → 823 | 464 → 446 |

[Harness](bench/compare.cjs), [Node run 1](bench/node24.json),
[run 2](bench/node24-repeat2.json), [run 3](bench/node24-repeat3.json),
[Bun run 1](bench/bun14.json), [run 2](bench/bun14-repeat2.json) and
[run 3](bench/bun14-repeat3.json) retain all samples, upstream/previous/current
medians, versions, hashes, counts and checksums. The original release's measurements
remain in [commit 7744a9e](https://github.com/VentiMath/vpm/blob/7744a9ee18a03ea3720a940b660990eb9727c913/packages/vonce/README.md).
Reproduce sequentially, using fresh processes for repeats:

```sh
OUTPUT=/tmp/vonce-node.json node packages/vonce/bench/compare.cjs
OUTPUT=/tmp/vonce-bun.json bun packages/vonce/bench/compare.cjs
```

## Distribution and provenance

Node.js 24+ package baseline; this change was tested and benchmarked locally on
Node 24 and Bun. Install from this workspace or run `bun pm pack --ignore-scripts`
in `packages/vonce` and install the resulting archive with npm or Bun. VPM does
not yet publish these packages to npm. Archives contain only source, declarations,
metadata, README, license and provenance; tests and comparison fixtures stay here.

Derived from [once](https://www.npmjs.com/package/once) under ISC, with copyright
notices preserved in [LICENSE](LICENSE). The removed
[wrappy](https://www.npmjs.com/package/wrappy) comparison fixture retains its own
ISC license. [Provenance](PROVENANCE.json) records the exact release commits,
registry archive integrity and SHA-256 fixture hashes. Published archives were
verified against their SHA-512 integrity before extracting comparison fixtures.
