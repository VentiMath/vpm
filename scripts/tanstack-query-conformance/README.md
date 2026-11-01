# TanStack Query conformance

Baseline: **@tanstack/query-core and @tanstack/react-query 5.105.0**, the npm
tarballs recorded in the packages' provenance
([core](../../packages/vtanstack-query-core/PROVENANCE.json),
[React](../../packages/vtanstack-react-query/PROVENANCE.json)), checked November
1, 2026. From the release commit (`5cc606e2e84b6feb86a2284a984ba2d3ef1643c8`,
tags `@tanstack/query-core@5.105.0` and `@tanstack/react-query@5.105.0`),
`upstream/` retains both packages' test directories, vitest configurations,
tsconfigs and React test setup, the internal `query-test-utils` package, the
root tsconfig and the license. Files carry a `.txt` suffix and are verified
against `SHA256.json` before use. The fixture pins the originals,
`@tanstack/query-persist-client-core` 5.105.0 (one React test uses it) and the
test tools at the versions in the release's lockfile: vitest 5.0.5, Vite 8.3.1,
jsdom 27.4.0, React 19.2.4, Testing Library 16.3.2, react-render-stream 2.0.2,
jest-dom 6.9.1, react-error-boundary 4.1.2 and TypeScript 6.0.3.

```sh
npm --prefix scripts/tanstack-query-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/tanstack-query-conformance/run.cjs --package=core --upstream
node scripts/tanstack-query-conformance/run.cjs --package=core
node scripts/tanstack-query-conformance/run.cjs --package=react --upstream
node scripts/tanstack-query-conformance/run.cjs --package=react
node scripts/tanstack-query-conformance/regressions.cjs
```

Repeat the core suite and the regressions with Bun.

`run.cjs` runs a package's suite with upstream's configuration (jsdom,
`restoreMocks`, typecheck, and for React the React plugin and setup file). The
tests import their package's modules from `../`; each module becomes a
re-export of the same module in the published `build/modern` of the package
under test, so internal modules such as `utils`, `retryer` and `query` keep one
identity, and `@tanstack/query-core` resolves to the core under test, which the
React package and the persister share. The packages are processed by vitest as
upstream's sources are (some tests spy on module namespaces). Type tests
(`*.test-d.*`) compile against the built declarations with upstream's compiler
options. All 1,608 core tests in 41 files and all 609 React tests in 35 files
pass for the original and VPM on Node; the core suite also passes for both on
Bun. Under Bun, vitest 5 gives the React suite's setup file an undefined
`expect` (jest-dom's `expect.extend` fails), so that suite runs on Node.

`regressions.cjs` reproduces each change with the original and checks it here:
on a simulated clock whose timers treat delays above 2^31 - 1 ms as 1 ms (as
Node and browsers do), with the environment set to a browser's, a `gcTime` of 30
days (the original collects the unused query at once) and a `refetchInterval`
of 30 days (the original fetches 1,001 times in the first second); and a
`QueryClient` import compiled without DOM types (TS2304 for `AbortSignal` and
`VoidFunction` in the original).
