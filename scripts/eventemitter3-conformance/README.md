# EventEmitter3 contract

Pins EventEmitter3 5.0.4 and Redoc 2.5.0, the API viewer imported by VentiMath's
MockApiDoc at main d0a71aaf. Redoc's peer dependencies are comparison fixtures.
The VPM package has zero runtime dependencies.

- Eight owned regressions cover contexts, symbols/prototype-looking names,
  dispatch mutation, recursive/throwing once callbacks, filtered removal,
  returned snapshots, inheritance and the empty-name correction.
- All 40 unmodified upstream tests run against the VPM constructor on Node/Bun.
  [Test source](https://github.com/primus/eventemitter3/blob/5.0.4/test/test.js)
  and its MIT license are retained in upstream/. Only the fixture entry chooses
  the replacement; no runtime from upstream is shipped.
- 512 seeded traces compare 61,440 operations with upstream. The valid empty
  event-name correction is checked separately, rather than normalized away.
- Chrome runs unchanged Redoc HistoryService and ScrollService against both
  emitters: actual URL replacement, emitted IDs, subscribe, unsubscribe,
  resubscribe and disposal. It does not render the whole app or prove adoption.
- Strict TS7 CJS/ESM and Bundler consumers, and fresh/frozen npm/Bun exact-archive
  installs, verify exports and declarations.

```sh
npm --prefix scripts/eventemitter3-conformance ci --ignore-scripts --legacy-peer-deps
node --test packages/veventemitter3/test/*.test.cjs
bun test packages/veventemitter3/test
node scripts/eventemitter3-conformance/probe.cjs
node scripts/eventemitter3-conformance/types.cjs
node scripts/eventemitter3-conformance/archives.cjs
```

The [benchmarks](../../packages/veventemitter3/bench/results/README.md) use isolated
processes, balanced ordering and identical-source controls. Every sample remains
in the reports; no application performance claim follows from dispatch timings.
