# vtanstack-query-core

An independently written query cache for the APIs VentiMath uses, checked
against **@tanstack/query-core 5.105.3**. It deduplicates requests, caches data,
notifies observers, retries failures, and coordinates mutations with cache
invalidation. Zero runtime dependencies. Native ES modules also load through
`require()` on Node 24 and Bun.

```js
import { QueryClient, QueryObserver } from 'vtanstack-query-core';

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
const observer = new QueryObserver(client, {
  queryKey: ['todos'],
  queryFn: ({ signal }) => fetch('/api/todos', { signal }).then(r => r.json()),
});
const unsubscribe = observer.subscribe(result => console.log(result.status, result.data));
// On teardown: unsubscribe(); client.clear();
```

## Contract

The [declarations](query-client.d.ts) define the supported surface: `QueryClient`,
query and mutation caches/observers, key and predicate filters, dependent queries,
staleness and collection, invalidation/refetch, cancellation, retries, online and
focus recovery, polling, initial/placeholder data, selection, and mutation
callbacks with optimistic context. Browser lifecycle subscriptions are owned by
`client.mount()` / `client.unmount()`; the React provider handles them.

Infinite and streamed queries, dehydration/hydration, persistence, suspense,
mutation scopes, and custom timeout/environment providers are outside this
contract. This is a scoped replacement, not every export of TanStack Query.
Query keys and structural sharing target JSON-shaped data; exotic instances
retain the supplied value. Native `AbortController` and modern browser APIs are
required. React bindings live in [vtanstack-react-query](../vtanstack-react-query).

## Implementation and differences

The former upstream build has been replaced with an independent Map-based cache,
explicit request records and AbortControllers, and observers that own their
subscriptions and timers. A cancelled request cannot overwrite a newer result,
even when its transport ignores abort. Unmount cancels a consumed signal while
allowing a request whose signal was never consumed to finish into the cache.
Mutation callbacks await invalidation before reporting success.

Long delays are split into bounded platform timers. The retained regression
reproduces upstream's 30-day collection running immediately and its 30-day polling
running 1,001 times in one second; here collection and polling wait the full
duration. Declarations compile without ambient DOM or Node types and use the
runtime's AbortSignal declaration when available.

The implementation was informed by the public contract, upstream tests and source
inspection. It is not a clean-room claim. [PROVENANCE.json](PROVENANCE.json)
records the comparison release and evidence; MIT attribution is retained.

An empty query with `staleTime: 'static'` remains eligible for refetch until it
has data. Shallow comparisons require matching own property names, including
when the values are `undefined`. Both cases match the 5.105.3 comparison baseline.

## Verification

- [Focused cache tests](test/application-cache.test.cjs): request sharing,
  invalidation, disabled readers, retry/focus/offline behavior, cancellation,
  structural sharing, rollback and concurrent mutations on Node 24 and Bun.
- [Timer and import tests](test/core.test.cjs) and [type checks](test/types.ts).
- [Application comparisons](../../scripts/tanstack-query-conformance/README.md):
  mounted React behavior against the original, developer-tool interaction, long
  timers, and strict declaration consumers. The old full-suite pass applied to
  the copied build; it is not evidence for this narrower implementation.
- [Benchmarks](bench/results/README.md) retain separate processes, controls and
  raw measurements. Microbenchmarks do not establish application speedups.

## Measurements

Against 5.105.3, cache reads took 6% less time on Node and 33% less on Bun;
request deduplication took 60% and 41% less, respectively. Six Node cases and
five Bun cases were faster in every pair beyond the measured control spread.
The unchanged 16-record JSON update remains **18% slower on Bun**; its Node
direction is inconclusive because one process pair reversed. Bun construction
is also inconclusive. These are local cache operations with no network, not
measured application speedups. The report retains every sample and control.
