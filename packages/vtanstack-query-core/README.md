# vtanstack-query-core

TanStack Query's framework-agnostic core, targeting **@tanstack/query-core
5.105.0**, the latest stable release checked November 1, 2026. Zero
dependencies; ES module and CommonJS builds for browsers, Node.js 24+ and Bun.
[`vtanstack-react-query`](../vtanstack-react-query/README.md) builds on it.

```js
import { QueryClient, QueryObserver } from 'vtanstack-query-core';

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
const observer = new QueryObserver(client, {
  queryKey: ['todos', { done: false }],
  queryFn: ({ signal }) => fetch('/api/todos?done=false', { signal }).then((response) => response.json()),
});
const unsubscribe = observer.subscribe((result) => console.log(result.status, result.data));
```

This is 5.105.0's published modern build: `QueryClient`, the query and mutation
caches and observers, infinite and streamed queries, retries, the focus, online,
timeout and environment managers, structural sharing, key hashing and
dehydration/hydration, with the same exports and declarations.

## Changes from 5.105.0

- **Timers longer than about 24.8 days.** The platform's `setTimeout` and
  `setInterval` treat a delay above 2^31 - 1 ms as 1 ms, and the default timeout
  provider passed every delay through. So a `gcTime` of 30 days, the kind of
  value set to keep a persisted cache, collected an unused query at once, and a
  `refetchInterval` of 30 days refetched every millisecond (1,001 fetches in the
  first second). Upstream documents the limit and suggests a custom provider;
  here the default provider runs longer delays as a chain of timers, so they
  last as long as asked. Custom providers set with
  `timeoutManager.setTimeoutProvider` are used as before.
- **Declarations without DOM types.** A query function's `signal` was typed with
  the DOM's `AbortSignal`, and one helper with `VoidFunction`, so a project
  compiled without DOM or Node types (a worker, or a server build with
  `"types": []`) failed with TS2304. `AbortSignal` is now the runtime's when one
  is declared, with a structural fallback, and `VoidFunction` is `() => void`.
- **Modern build only.** The legacy build, reached only through the `main` and
  `module` fields by tools that do not read `exports`, and the TypeScript
  sources, reached only through React Native's `react-native` field and
  TanStack's monorepo condition, are not shipped; source maps keep their
  embedded sources. The package is 1.7 MB and 169 files unpacked instead of
  3.9 MB and 365.

Every other file is byte-identical to 5.105.0; the
[focused tests](test/core.test.cjs) check the recorded hashes.

## Evidence

- [Upstream suite](../../scripts/tanstack-query-conformance/README.md): the
  release's 1,608 query-core tests in 41 files, runtime and type tests, run with
  its own vitest configuration against the built modules, pass for the original
  and VPM on Node and Bun.
- [Regressions](../../scripts/tanstack-query-conformance/regressions.cjs): the
  long `gcTime` and `refetchInterval` cases on a simulated clock, and the
  declarations compiled without DOM types.
- [Focused tests](test/core.test.cjs) (the timer chain in both module formats,
  cancellation part-way, long intervals) and [type tests](test/types.ts).

MIT licensing, the pinned source and the modified files are recorded in
[PROVENANCE.json](PROVENANCE.json).
