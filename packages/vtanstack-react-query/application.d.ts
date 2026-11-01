import type {Context, ReactNode, ReactElement} from 'react';
import type {QueryClient, QueryKey, QueryOptions, QueryObserverResult, MutationOptions, MutationCallbacks, MutationObserverResult} from 'vtanstack-query-core';
export * from 'vtanstack-query-core';
export type UseQueryOptions<T = unknown, E = Error, D = T, K extends QueryKey = QueryKey> = QueryOptions<T, E, D, K>;
export type UseQueryResult<T = unknown, E = Error> = QueryObserverResult<T, E>;
export type UseMutationOptions<T = unknown, E = Error, V = void, C = unknown> = MutationOptions<T, E, V, C>;
export type UseMutationResult<T = unknown, E = Error, V = void, C = unknown> = Omit<MutationObserverResult<T, E, V, C>, 'mutate'> & {
  mutate(variables: V, options?: MutationCallbacks<T, E, V, C>): void;
  mutateAsync(variables: V, options?: MutationCallbacks<T, E, V, C>): Promise<T>;
};
export const QueryClientContext: Context<QueryClient | undefined>;
export function QueryClientProvider(props: {client: QueryClient; children?: ReactNode}): ReactElement;
export function useQueryClient(providedClient?: QueryClient): QueryClient;
export function useQuery<T = unknown, E = Error, D = T, K extends QueryKey = QueryKey>(options: UseQueryOptions<T, E, D, K>, client?: QueryClient): UseQueryResult<D, E>;
export function useMutation<T = unknown, E = Error, V = void, C = unknown>(options: UseMutationOptions<T, E, V, C>, client?: QueryClient): UseMutationResult<T, E, V, C>;
