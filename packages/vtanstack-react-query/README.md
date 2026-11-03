# vtanstack-react-query

Independently written React bindings for VentiMath's query and mutation usage,
checked against **@tanstack/react-query 5.105.3**. Built on
[vtanstack-query-core](../vtanstack-query-core), with React 18 or 19 as a peer.
Mounted release checks cover React 19.1.0 and 19.2.4.

```jsx
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from 'vtanstack-react-query';

const client = new QueryClient();
function Todos() {
  const cache = useQueryClient();
  const todos = useQuery({ queryKey: ['todos'], queryFn: () => fetch('/api/todos').then(r => r.json()) });
  const add = useMutation({
    mutationFn: title => fetch('/api/todos', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['todos'] }),
  });
  if (todos.isPending) return 'Loading';
  if (todos.isError) return todos.error.message;
  return <button onClick={() => add.mutate('Read')}>{todos.data.length} todos</button>;
}
export const App = () => <QueryClientProvider client={client}><Todos /></QueryClientProvider>;
```

## Contract

Exports `QueryClientContext`, `QueryClientProvider`, `useQuery`, `useMutation`,
`useQueryClient`, and the scoped core exports. Hooks use React's external-store
subscription API; the provider owns client mount/unmount, and the core owns
requests and cached data. Cache writes remain synchronous, while query and mutation
notifications to React use `notifyManager`'s scheduler. This prevents immediate
store updates from interrupting async retry transitions; unsubscribed hooks
ignore already queued notifications. Mutation promises await callbacks, including cache
invalidation and rollback. Result and option types are in
[application.d.ts](application.d.ts).

`useQueries`, infinite queries, suspense, hydration boundaries, persistence,
error-reset boundaries, and React's experimental query-result promise are not
implemented. They are not used by the application scope inspected for this
replacement. This package does not claim all TanStack Query APIs or the old
copied build's full upstream test pass. The [release installation recipe](../../docs/INSTALLATION.md#tanstack-query)
keeps the application's `@tanstack/react-query` import name, including Devtools
imports, while resolving it to this package. This repository does not change
VentiMath's deployment.

## Evidence

[Mounted comparisons](../../scripts/tanstack-query-conformance/README.md) run the
same scenarios against the pinned original and VPM on Node 24 and Bun: shared
requests, dependent keys, pending mutations during invalidation, optimistic
rollback, unmount cancellation, and provider isolation. The core's long-timer and
DOM-independent declaration checks remain in place. Its developer-tool cache
interface is exercised with VentiMath's pinned tools. The November 2 declaration comparison used committed app snapshot `7a8aad2c`: its
171 importing files use the five application APIs above. Both the original and
replacement declarations produced the same 47 existing TypeScript diagnostics;
the replacement added none. This does not assert a clean application typecheck
or establish behavior for every app screen.

The `tanstack-5.105.3-r2` release fixes the partial-results and empty-paper retry
failures observed with React 19.1.0. All eight unchanged PaperPanel tests pass
with the revised hooks and with upstream 5.105.3; the original release failed
two. Public regression fixtures cover scheduled query/mutation updates and
async transitions that refetch missing data, enable a dependent query, or await
a mutation. These checks run against source and installed archives.

Release checks install the exact archives with npm and Bun, mount the unchanged
React Devtools 5.91.3 beside the hooks, and verify a shared provider. A Chrome
production bundle loads a query and refreshes it after mutation. NodeNext and
Bundler declaration consumers compile with TypeScript 7.

The hooks are implemented in [bindings.js](bindings.js), with a small
[index.js](index.js) entry. The published upstream runtime and its source maps
are no longer shipped. [PROVENANCE.json](PROVENANCE.json) records the comparison
release, scope and attribution; this is not a clean-room claim.
