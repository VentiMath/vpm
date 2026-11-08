# React virtualizer conformance

Pinned controls: @tanstack/react-virtual 3.14.26 and app-pinned 3.11.2. The current
control depends on virtual-core 3.19.11. Upstream code is test-only; none ships in
the VPM adapter. The shared [core fixture](../virtual-core-conformance/README.md)
provides unchanged Material React Table 3.2.1 row/column hooks and source hashes.

`ssr.cjs` compares 32 element/window, horizontal/vertical, enabled/disabled and
list-size snapshots on Node and Bun. `build.cjs` verifies pinned fixture hashes
and bundles production React table callers plus development React lifecycle
checks. Native Chrome checks 24 table snapshots across current/app/VPM adapters,
including iframe ownership, scroll alignment, pinning, dragging, dynamic sizes,
focused DOM identity and cleanup. Current behavior matches; the old control's
viewport measurement and one cached detail size differ as documented in the core.

`lifecycle.mjs` additionally checks StrictMode subscription cleanup, stable
instances and focused nodes across parent renders, synchronous versus batched
updates, SSR hydration, and three adapter improvements using the same VPM core
in both controls: committed handlers during suspended transitions, suppression
of callbacks after disposal, and no setup-time flushSync warning. These are real
library callers with synthetic data, not an authenticated app acceptance test.

`archives.cjs` packs both VPM packages, checks archive and installed bytes, then
checks npm/Bun fresh and frozen installs under the upstream React adapter alias.
React 19.1/19.2, Node/Bun SSR, CJS/ESM, TS7 NodeNext/Bundler and native Chrome
caller/lifecycle behavior are verified. Local archive overrides prevent registry
fallback for the internal core dependency; these are not release URL tests.

```sh
npm --prefix scripts/virtual-core-conformance ci --ignore-scripts
npm --prefix scripts/react-virtual-conformance ci --ignore-scripts
node scripts/react-virtual-conformance/archives.cjs
```
