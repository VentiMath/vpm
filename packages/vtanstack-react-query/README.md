# vtanstack-react-query

TanStack Query for React, targeting **@tanstack/react-query 5.105.0**, the latest
stable release checked November 1, 2026, on
[`vtanstack-query-core`](../vtanstack-query-core/README.md). React 18 or 19 is a
peer. ES module and CommonJS builds.

```jsx
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from 'vtanstack-react-query';

const queryClient = new QueryClient();

function Todos() {
  const client = useQueryClient();
  const todos = useQuery({ queryKey: ['todos'], queryFn: () => fetch('/api/todos').then((r) => r.json()) });
  const add = useMutation({
    mutationFn: (title) => fetch('/api/todos', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['todos'] }),
  });
  if (todos.isPending) return 'Loading';
  return <button onClick={() => add.mutate('Read')}>{todos.data.length} todos</button>;
}

export const App = () => <QueryClientProvider client={queryClient}><Todos /></QueryClientProvider>;
```

This is 5.105.0's published modern build: `QueryClientProvider`, `useQuery`,
`useQueries`, `useInfiniteQuery`, the suspense hooks, `useMutation`,
`useMutationState`, `useIsFetching`, `HydrationBoundary`, the error reset
boundary and the `queryOptions` helpers, re-exporting the core's API, with the
same declarations.

| Upstream dependency | Here |
| --- | --- |
| `@tanstack/query-core` 5.105.0 | `vtanstack-query-core` |

## Changes from 5.105.0

- **The core's fixes apply.** `gcTime`, `staleTime` and `refetchInterval` longer
  than about 24.8 days last as long as asked instead of firing at once, and the
  declarations compile without DOM types; see
  [vtanstack-query-core](../vtanstack-query-core/README.md).
- **Modern build only.** The legacy build, the TypeScript sources and the v4/v5
  migration codemods (jscodeshift transforms run once from a checkout) are not
  shipped. The package is 0.8 MB and 186 files unpacked instead of 1.8 MB and
  410.

Every file is byte-identical to 5.105.0 apart from the core's package name, a
specifier of the same length, so source maps stay valid; the
[focused tests](test/react-query.test.cjs) check the recorded hashes.

## Evidence

- [Upstream suite](../../scripts/tanstack-query-conformance/README.md): the
  release's 609 react-query tests in 35 files (hooks, suspense, SSR hydration,
  error boundaries and type tests) pass for the original and VPM.
- [Focused tests](test/react-query.test.cjs).

MIT licensing, the pinned source, the dependency map and the modified files are
recorded in [PROVENANCE.json](PROVENANCE.json).
