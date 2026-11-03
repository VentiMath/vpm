# TanStack Query application compatibility

The independent VPM packages implement the query and mutation APIs VentiMath
uses. They are compared with **@tanstack/query-core and @tanstack/react-query
5.105.3**, with 5.105.0 retained as an older control. The earlier full upstream test pass belonged to the retained upstream
build, which has been removed. It is not a claim about the scoped rewrite.

```sh
npm --prefix scripts/tanstack-query-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vtanstack-query-core/test/*.test.cjs packages/vtanstack-react-query/test/*.test.cjs
node scripts/tanstack-query-conformance/sharing.cjs
node scripts/tanstack-query-conformance/application.cjs --upstream
node scripts/tanstack-query-conformance/application.cjs --current
node scripts/tanstack-query-conformance/current.cjs
node scripts/tanstack-query-conformance/application.cjs
node scripts/tanstack-query-conformance/devtools.cjs --upstream
node scripts/tanstack-query-conformance/devtools.cjs
node scripts/tanstack-query-conformance/archives.cjs
node scripts/tanstack-query-conformance/regressions.cjs
```

Repeat these checks with Bun. `application.cjs` mounts React 19.2.4 hooks with
Testing Library and jsdom. Identical assertions cover request sharing, dependent
keys, mutation invalidation, optimistic rollback, cancellation provider isolation, and browser focus events. `devtools.cjs` mounts the developer UI used by react-query-devtools
5.91.3, reads query details and invalidates an active query through its controls.
The tools are fixtures, not runtime dependencies of VPM. `sharing.cjs` compares
2,000 deterministic JSON trees and unchanged references with upstream.
`archives.cjs` installs both package tarballs in an isolated consumer and runs
mounted scenarios, module identity and strict declaration checks there.

`regressions.cjs` runs each library in a separate simulated browser process.
The simulated platform clamps delays above 2^31 - 1 ms to 1 ms. Upstream collects
a 30-day cache entry immediately and polls 1,001 times in a second; VPM retains
it and polls at the requested interval. Declaration consumers compile with and
without DOM types; VPM passes both, while the original requires DOM declarations.

The inspected application imports `useQuery`, `useMutation`, `useQueryClient`,
`QueryClient`, and `QueryClientProvider`. Its cache operations include
invalidation, removal and optimistic data updates. Infinite/streamed queries,
persistence, hydration and suspense are outside the replacement's contract.
The [core](../../packages/vtanstack-query-core/README.md) and
[React](../../packages/vtanstack-react-query/README.md) READMEs define the limits.

## React transition regressions

`transitions.cjs` is shared by the mounted application comparisons and clean
release consumers. It verifies that cache writes stay synchronous while React
query and mutation notifications respect a controlled scheduler. It then uses
async `useTransition` buttons to retry partial results, an empty catalog with a
dependent query, and a mutation that awaits a catalog refresh. Both upstream
5.105.3 and VPM pass. The original VPM release fails the scheduler assertion.
Release consumers exercise React 19.1.0 (npm) and 19.2.4 (Bun), with each consumer
run on both Node 24 and Bun.

The application's eight unchanged PaperPanel tests also pass with revised VPM
and upstream 5.105.3; the original release fails the partial-results and
empty-paper retries. This local check swaps only the Query package, retaining
the app's React 19.1.0 and actual UI components; it does not change app source.

## Current baseline and release consumers

`current.cjs` compares 5.105.3 and VPM for an empty static query recovering on
refetch, own-key shallow equality, deduplicated undefined-data rejection, and
a mutation going online while its awaited `onMutate` callback is pending.
The shallow-equality fixture reads the upstream utility directly; this is a
regression control, not an added application API.

`app-types.cjs APP_REPOSITORY COMMIT` archives a committed app snapshot into a
temporary directory and compares its TypeScript diagnostics with only the query
declarations substituted. It does not modify the app checkout. On `7a8aad2c`,
171 source files import the five supported APIs; both runs have the same 47
existing diagnostics and no added errors. This local check needs the app checkout
and installed dependencies, so it is not part of public CI.

`pack-tanstack-release.cjs` and `check-tanstack-release.cjs` prepare and test
committed archives with exact transitive release URLs. The consumer keeps
`@tanstack/react-query` as its dependency/import name to share context with React
Devtools 5.91.3. Tests cover npm/Bun installs, Node/Bun mounted hooks and Devtools,
CJS/ESM identity, TypeScript 7 NodeNext/Bundler consumers, and a Chrome production
bundle. The published check uses a fresh cache with no overrides and verifies
frozen installs. See the [release instructions](../../docs/INSTALLATION.md#tanstack-query).

## Retained upstream evidence

`upstream/` retains TanStack's test files, configurations and license from commit
`5cc606e2e84b6feb86a2284a984ba2d3ef1643c8`, with SHA-256 hashes checked before use.
The original 1,608 core and 609 React tests remain runnable as controls:

```sh
node scripts/tanstack-query-conformance/run.cjs --package=core --upstream
node scripts/tanstack-query-conformance/run.cjs --package=react --upstream
```

These tests reach private upstream modules and cover APIs outside VPM's subset.
The runner therefore accepts only `--upstream`; application comparisons test the
replacement through public APIs. The fixture's TypeScript 6 compiler belongs to
upstream's suite. VPM declarations are checked with the workspace compiler.
