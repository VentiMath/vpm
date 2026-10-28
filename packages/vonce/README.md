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
  this package; there is no runtime `wrappy` import.

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

16 focused tests cover state collisions and tampering, frozen wrappers, receiver
and argument forwarding, returns, reentrancy, exceptions, strict errors, Promise
identity/rejection, accessors, symbols, `__proto__`, invalid callbacks, isolated
prototype installation/conflicts, CJS/ESM imports and 1,000 generated comparisons.
The shared gate passes **160 HTTP checks** on Node 24.22.1 and Bun 1.4.0. Its real
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

## Benchmarks

Recorded 2026-10-27 on macOS arm64, Node 24.22.1 and Bun 1.4.0, against unmodified
`once` 1.4.0 and `wrappy` 1.0.2 fixtures. The fixture loader evaluates upstream in
the same JavaScript realm. Nine alternating-order samples, corpus/case warmup,
equal-result checks and consumed outputs. Medians below are nanoseconds per
operation, lower is better. Creation cases include allocation and metadata work;
repeated-call cases create their wrappers before timing. Ordinary cases run
50,000 operations per sample, cached calls 1,000,000 and strict rejections 10,000.

The read-only accessors and descriptor-safe metadata add construction cost:
**8.2–11.5× upstream on Node and 2.6–3.2× on Bun**, approximately **0.48–0.89 µs
and 0.21–0.39 µs extra**, respectively. Cached calls remain comparable (single-digit
nanoseconds in this harness). Strict rejection is within about 1% on Node and 5%
on Bun. This is a correctness and dependency improvement, not a general speedup.
Express creates its listen callback at server startup; these measurements do not
establish an application throughput change.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| create wrapper | 75 → 611 | 109 → 322 |
| create and first call | 46 → 525 | 139 → 360 |
| create, first and cached call | 50 → 541 | 129 → 376 |
| create with three metadata fields | 102 → 993 | 176 → 564 |
| create strict and first call | 61 → 665 | 125 → 375 |
| cached call | 9 → 8 | 7 → 6 |
| cached strict rejection | 4060 → 4089 | 308 → 324 |

[Harness](bench/compare.cjs), [Node samples](bench/node24.json), and
[Bun samples](bench/bun14.json) include all samples, runtime versions, source,
fixture and loader hashes, counts and checksums. Reproduce sequentially:

```sh
OUTPUT=/tmp/vonce-node.json node packages/vonce/bench/compare.cjs
OUTPUT=/tmp/vonce-bun.json bun packages/vonce/bench/compare.cjs
```

## Distribution and provenance

Node.js 20+ package baseline; this change was tested and benchmarked locally on
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
