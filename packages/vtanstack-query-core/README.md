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

The refreshed source-verified comparison with 5.105.3 finds all seven Node
cases faster beyond identical-code controls. Bun cache reads, request sharing,
active invalidation and mutation cleanup are faster beyond controls; construction
and fresh cache-hit directions are inconclusive. The unchanged 16-record JSON
update remains **20.7% slower on Bun**. No JSON-update optimization was made in
this followup, so the changed percentage from the previous 18% recording is not
a new performance fix or a measured consequence of the render-state repair.
These local cache measurements do not measure browser rendering or app latency.
