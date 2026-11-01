import {QueryClient, QueryObserver, hashKey, type QueryFunctionContext, type QueryKey} from 'vtanstack-query-core';
const client = new QueryClient({defaultOptions: {queries: {gcTime: 30 * 24 * 60 * 60 * 1000, staleTime: 60_000}}});
const observer = new QueryObserver<string[], Error, number>(client, {
  queryKey: ['todos', {done: false}],
  queryFn: async (context: QueryFunctionContext<QueryKey>) => {
    const aborted: boolean = context.signal.aborted;
    context.signal.addEventListener('abort', () => undefined);
    return aborted ? [] : ['a'];
  },
  select: todos => todos.length,
});
const count: number | undefined = observer.getCurrentResult().data;
const key: string = hashKey(['todos', 1]);
// @ts-expect-error select receives the query function's data
new QueryObserver<string[], Error, number>(client, {queryKey: ['x'], queryFn: async () => ['a'], select: (todos: number) => todos});
void [count, key];
