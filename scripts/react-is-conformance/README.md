# react-is comparison fixtures

Pinned react-is **19.3.1**, React **19.3.1**, and the application's React **19.1.0**
with MUI **7.2.0**. These are development fixtures, not runtime dependencies.
The lockfile records all transitive versions.

`run.cjs` verifies the SHA-256 of the release's unchanged 14-test ReactIs suite,
then runs every assertion against upstream and VPM. Bun compiles JSX; a small
assertion adapter provides the suite's Jest-style lifecycle and matchers. React
and ReactDOM are real packages. The test environment supplies a minimal portal
container (`nodeType: 1`) and the SuspenseList symbol exported by React's
feature-enabled internal test build. This enables the original gated test;
no assertion is removed or marked as an expected failure. These classification
tests do not exercise DOM rendering.

`callers.cjs` separately renders five actual React 19.1/MUI cases (MenuList,
ToggleButtonGroup and Select) and exercises MUI's real deepmerge and display-name
helpers. Isolated processes substitute only the resolved react-is export;
instrumented calls must be nonzero and output/call counts must match.

Package tests compare all public symbols and predicates on over 800 actual and
generated values, including cross-realm objects, inherited markers, malformed
wrappers and current ViewTransition support. Getter controls document the
intentional single-read and unrelated-metadata differences. CJS/ESM identities
are checked. `archives.cjs` verifies fresh npm/Bun installs, CJS/ESM loading,
browser bundling and TypeScript 7 consumers without ambient React/platform types.

```sh
npm --prefix scripts/react-is-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vreact-is/test/*.test.cjs
bun test packages/vreact-is/test/react-is.test.cjs
node scripts/react-is-conformance/archives.cjs
```

The upstream test and license are retained under `upstream`; its exact source
commit and hash are recorded in `upstream/provenance.json`. Benchmarks use the
repository's isolated-process harness and retain all samples and control results.
