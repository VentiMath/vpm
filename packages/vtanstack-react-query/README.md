# vtanstack-react-query

Independently written React bindings for VentiMath's query and mutation usage,
checked against **@tanstack/react-query 5.105.0**. Built on
[vtanstack-query-core](../vtanstack-query-core), with React 18 or 19 as a peer.
Mounted comparisons currently use React 19.2.4.

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
requests and cached data. Mutation promises await callbacks, including cache
invalidation and rollback. Result and option types are in
[application.d.ts](application.d.ts).

`useQueries`, infinite queries, suspense, hydration boundaries, persistence,
error-reset boundaries, and React's experimental query-result promise are not
implemented. They are not used by the application scope inspected for this
replacement. This package does not claim all TanStack Query APIs or the old
copied build's full upstream test pass. Adoption still requires replacing imports
or package aliases; this repository does not change VentiMath's deployment.

## Evidence

[Mounted comparisons](../../scripts/tanstack-query-conformance/README.md) run the
same scenarios against the pinned original and VPM on Node 24 and Bun: shared
requests, dependent keys, pending mutations during invalidation, optimistic
rollback, unmount cancellation, and provider isolation. The core's long-timer and
DOM-independent declaration checks remain in place. Its developer-tool cache
interface is exercised with VentiMath's pinned tools. The frontend declaration
comparison added no errors to VentiMath's existing baseline; it does not assert
that the baseline application typecheck is clean.

The hooks are implemented in [bindings.js](bindings.js), with a small
[index.js](index.js) entry. The published upstream runtime and its source maps
are no longer shipped. [PROVENANCE.json](PROVENANCE.json) records the comparison
release, scope and attribution; this is not a clean-room claim.
