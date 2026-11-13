# Scheduler verification

Pinned control: scheduler 0.28.0; real caller: React DOM 19.3.1. Upstream runtime
is executed unchanged as a black box. No upstream runtime source was inspected
or copied into the independent implementation.

- 774 deterministic traces compare deadline order, FIFO peers, delays,
  continuations, time-slice/paint yielding, priority context and error recovery
  through immediate, MessageChannel and timer-only hosts in both isolated and native JavaScript realms.
- Unit regressions check immediate cancellation cleanup, self-cancellation,
  timer overflow protection, failures, callback ownership and invalid input.
- Chrome substitutes the scheduler beneath unchanged React DOM: interrupts an
  in-progress transition with an urgent update, suppresses obsolete rendering,
  completes another transition, retries Suspense, preserves hydration/focus and
  cleans effects up. Both production and development builds run.
- Strict TypeScript 7 NodeNext/Bundler consumers require no ambient platform
  declarations. Exact archives pass CJS/ESM, fresh/frozen npm/Bun installs and the
  React DOM dependency override; packed browser and contract checks run too.

```sh
npm ci --prefix scripts/scheduler-conformance --ignore-scripts --no-audit --no-fund
node --test packages/vscheduler/test/scheduler.test.cjs
bun test packages/vscheduler/test/scheduler.test.cjs
node scripts/scheduler-conformance/contract.cjs
bun scripts/scheduler-conformance/contract.cjs
node scripts/scheduler-conformance/types.cjs
node scripts/scheduler-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/scheduler-conformance/browser.cjs
node scripts/scheduler-conformance/archives.cjs
```

The browser fixture uses synthetic contest/search content, not production data.
Full application adoption and other browser engines are not certified here.
[Package scope](../../packages/vscheduler/README.md) documents intentional
behavior differences and excluded experimental/test-only entries.
