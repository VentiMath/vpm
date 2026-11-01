# Floating UI React DOM conformance

The pinned baseline is **@floating-ui/react-dom 2.1.9**; its caller fixture is
**@floating-ui/react 0.27.20**. React/React DOM **19.1.0** match VentiMath's
current application. Other tools and all transitive packages are lockfile-pinned.

```sh
npm --prefix scripts/floating-react-dom-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/floating-react-dom-conformance/run.cjs
bun scripts/floating-react-dom-conformance/run.cjs
node --test packages/vfloating-ui-react-dom/test/react-dom.test.cjs
bun test packages/vfloating-ui-react-dom/test
node scripts/floating-react-dom-conformance/browser.cjs
node scripts/floating-react-dom-conformance/archives.cjs
```

The Vitest runner verifies the original source hashes, copies 15 unchanged tests
to a temporary project and aliases the implementation under test. It uses jsdom,
React cleanup and the original globals. It does not load upstream's unused
jest-dom matchers or synchronous requestAnimationFrame mock. Assertions are not
edited. Both implementations pass all 15 tests.

Nine common probes test out-of-order measurements, placement/reference changes,
open-state transitions, dependencies, arrow refs, Strict Mode cleanup, DPR styles
and the higher-level React popover's click/role/Escape behavior. The three stale
result controls deliberately assert the reproduced failure on upstream and its
correction on VPM. Reopening retained elements has an extra VPM assertion.
One VPM-only test exercises cyclic options and DOM identity changes. Thus the
combined totals are 24 upstream and 25 VPM tests on each runtime.

Chrome (selectable with `CHROME_BIN`) compares 72 mounted combinations of the
app's popover, tooltip and dropdown middleware, 12 placements and two style
modes. Both implementations must clean up every mounted subscription. This is
positioning coverage, not full focus-management or Safari/Firefox certification.

Archive checks install local tarballs using npm offline mode and Bun, checking
CJS/ESM identity, SSR, browser bundling and TypeScript 7 consumers in NodeNext and
bundler modes. Original type-test bytes are retained; import redirection is the
only source transformation. Both declarations must produce exactly the same one
unused expectation for string assignment to `HTMLElement.style`, allowed by
TypeScript 7's current DOM library. No other diagnostics are accepted. Separate
consumer files compile cleanly.

`prepare.cjs` links the pinned React peers into the package's ignored local
`node_modules` for direct package tests and benchmarks. Peers are not shipped or
added to workspace production dependencies. [Package provenance](../../packages/vfloating-ui-react-dom/PROVENANCE.json)
records the independent-runtime boundary and upstream attribution.

Benchmarks use production React builds in isolated workers. The mounted case uses
jsdom, an explicit asynchronous geometry platform and alternating coordinates; it
waits for the React commit before completing each operation. Setup stays outside
timing. Server rendering uses React DOM's server renderer in the same initialized
DOM environment; packed tests separately verify imports and SSR without a DOM.
Only the selected implementation loads in each worker. Four balanced comparison
pairs and two identical-source controls retain every sample.
