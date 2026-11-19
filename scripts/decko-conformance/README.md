# Decko checks

The pinned Decko 1.2.0 control comes from the existing
[event emitter / Redoc fixture](../eventemitter3-conformance/package.json).
Eight owned tests exercise bind identity/descriptors, factory/direct forms,
shared string-key caches, seeds, prototype-looking keys, delayed windows,
recursive scheduling and exceptions. A differential probe compares 51,200
memoization operations and ordinary delayed-call windows with upstream.

The browser bundles unchanged Redoc 2.5.0 twice, replacing only `decko` on the VPM
side, and compares HistoryService and ScrollService subscription, history,
binding and disposal behavior. This is a service-level caller check, not an app
release or full API-documentation visual check.

```sh
npm --prefix scripts/eventemitter3-conformance ci --ignore-scripts --legacy-peer-deps
node --test packages/vdecko/test/*.test.cjs
bun test packages/vdecko/test
node scripts/decko-conformance/probe.cjs
bun scripts/decko-conformance/probe.cjs
node scripts/decko-conformance/types.cjs
node scripts/decko-conformance/archives.cjs
```

The archive check packs only published files, installs with fresh and frozen npm
and Bun, verifies CJS/ESM identity, runs both runtimes' tests and differential
probes, compiles strict TS7 NodeNext/Bundler consumers, then checks the packed
implementation in Chrome. The benchmark covers binding and memoization; it does
not claim timer latency improvements.
