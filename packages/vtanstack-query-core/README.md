# vtanstack-query-core

An independently written query cache for the APIs VentiMath uses, checked
against **@tanstack/query-core 5.105.0**. It deduplicates requests, caches data,
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

In the recorded run, cache reads took 10% less time on Node and 33% less on Bun;
request deduplication took 44% and 31% less, respectively. Node's unchanged JSON
update took 20% less time, but the same case remained **14% slower on Bun**.
Node's fresh-cache fetch and Bun's construction/invalidation results are
inconclusive at the control spread. These are seven local cache operations with
no network; consult the raw samples and per-case evidence in the linked report.
