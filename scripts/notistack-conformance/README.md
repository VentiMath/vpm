# Notistack caller checks

The fixture pins Notistack 3.0.2 and React/React DOM 19.3.1. VentiMath main
`47b9d38c77ad02722131d564ba497d16feda38a9` uses a five-item bottom-right provider
and `useSnackbar().enqueueSnackbar` for authentication, calendar, scrumboard and
settings notifications. No upstream notification queue or runtime is copied.
Public declarations, documentation and black-box comparisons define the contract;
upstream style definitions had also been inspected during the prior Goober work.

```sh
npm --prefix scripts/notistack-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vnotistack/test/queue.test.cjs
bun test packages/vnotistack/test/queue.test.cjs
node scripts/notistack-conformance/run.cjs
bun scripts/notistack-conformance/run.cjs
node scripts/notistack-conformance/types.cjs
node scripts/notistack-conformance/browser.cjs
VNOTISTACK_MODE=development node scripts/notistack-conformance/browser.cjs
node scripts/notistack-conformance/archives.cjs
```

Queue and injected-clock tests cover overflow, persistence, deduplication, closing
pending/visible items, callback ordering/exceptions, reentrant enqueue, snapshots,
undefined option fallback, invalid options, disposal and overlapping pause reasons. Browser comparisons
cover five variants, six anchors, both densities, mobile/desktop widths, app class
overrides, actions, FIFO eviction, persistent overflow, duplicate prevention,
callback order, automatic dismissal and literal message content. Parent updates
preserve alert nodes. Additional VPM checks cover nested provider restoration,
owner-document portals, removed stylesheet recovery, overlapping hover/blur,
nonzero transitions and unmount cleanup. Development mode exercises StrictMode.

`run.cjs` checks public SSR imports, context and escaped messages on both runtimes.
`types.cjs` uses TS7 with strict NodeNext ESM/CJS and Bundler resolution.
`archives.cjs` packs vnotistack and its three VPM dependencies into scratch
consumers, installs through npm and Bun, repeats frozen installs, and runs the
installed APIs, types, queue tests and browser checks. Local file overrides are
only for verification; no unpublished name is trusted as a release dependency.

`bench/run.cjs` in the package runs the standard isolated-process benchmark against
production bundles of each implementation with the same React. Benchmarking uses
SSR, not a browser/frame-rate model. Custom transition adapters, exact icon glyphs
and timing-identical upstream animation are outside the documented scope.
