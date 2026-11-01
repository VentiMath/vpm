export type QueryKey = readonly unknown[];
export type QueryStatus = 'pending' | 'error' | 'success';
export type FetchStatus = 'fetching' | 'paused' | 'idle';
export type QuerySignal = typeof globalThis extends {AbortController: {prototype: {signal: infer S}}} ? S : {
  readonly aborted: boolean; readonly reason: unknown;
  addEventListener(type: 'abort', callback: () => void, options?: {once?: boolean}): void;
  removeEventListener(type: 'abort', callback: () => void): void;
};
export type Updater<TInput, TOutput> = TOutput | ((previous: TInput) => TOutput);
export interface QueryFunctionContext<K extends QueryKey = QueryKey> {client: QueryClient; queryKey: K; signal: QuerySignal; meta: Record<string, unknown> | undefined;}
export type QueryFunction<T = unknown, K extends QueryKey = QueryKey> = (context: QueryFunctionContext<K>) => T | Promise<T>;
export type RetryValue<E> = boolean | number | ((failureCount: number, error: E) => boolean);
export interface QueryOptions<T = unknown, E = Error, D = T, K extends QueryKey = QueryKey> {
  queryKey: K; queryFn?: QueryFunction<T, K> | typeof skipToken; queryHash?: string; queryKeyHashFn?: (key: K) => string;
  enabled?: boolean | ((query: Query<T, E>) => boolean);
  staleTime?: number | 'static' | ((query: Query<T, E>) => number | 'static'); gcTime?: number;
  retry?: RetryValue<E>; retryDelay?: number | ((failureCount: number, error: E) => number); retryOnMount?: boolean;
  refetchOnMount?: boolean | 'always' | ((query: Query<T, E>) => boolean | 'always');
  refetchOnWindowFocus?: boolean | 'always' | ((query: Query<T, E>) => boolean | 'always');
  refetchOnReconnect?: boolean | 'always' | ((query: Query<T, E>) => boolean | 'always');
  refetchInterval?: number | false | ((query: Query<T, E>) => number | false | undefined); refetchIntervalInBackground?: boolean;
  initialData?: T | (() => T | undefined); initialDataUpdatedAt?: number | (() => number | undefined);
  placeholderData?: T | ((previous: T | undefined, query: Query<T, E> | undefined) => T | undefined);
  select?: (data: T) => D; structuralSharing?: boolean | ((previous: unknown, next: unknown) => unknown);
  networkMode?: 'online' | 'always'; meta?: Record<string, unknown>;
  throwOnError?: boolean | ((error: E, query: Query<T, E>) => boolean);
}
export interface QueryState<T = unknown, E = Error> {
  data: T | undefined; dataUpdateCount: number; dataUpdatedAt: number;
  error: E | null; errorUpdateCount: number; errorUpdatedAt: number;
  fetchFailureCount: number; fetchFailureReason: E | null; fetchMeta: unknown;
  isInvalidated: boolean; status: QueryStatus; fetchStatus: FetchStatus;
}
export interface RefetchOptions {cancelRefetch?: boolean; throwOnError?: boolean;}
export interface QueryFilters {queryKey?: QueryKey; exact?: boolean; type?: 'all' | 'active' | 'inactive'; stale?: boolean; fetchStatus?: FetchStatus; predicate?: (query: Query<any, any>) => boolean;}
export interface InvalidateQueryFilters extends QueryFilters {refetchType?: 'none' | 'all' | 'active' | 'inactive';}
export interface QueryResultBase<T, E> {
  data: T | undefined; error: E | null; status: QueryStatus; fetchStatus: FetchStatus;
  isPending: boolean; isSuccess: boolean; isError: boolean; isLoading: boolean; isInitialLoading: boolean;
  isFetching: boolean; isRefetching: boolean; isPaused: boolean; isPlaceholderData: boolean; isLoadingError: boolean; isRefetchError: boolean;
  isFetched: boolean; isFetchedAfterMount: boolean; isStale: boolean; isEnabled: boolean;
  dataUpdatedAt: number; errorUpdatedAt: number; failureCount: number; failureReason: E | null; errorUpdateCount: number;
  refetch(options?: RefetchOptions): Promise<QueryObserverResult<T, E>>;
}
export type QueryObserverResult<T = unknown, E = Error> = QueryResultBase<T, E> & (
  {status: 'success'; data: T; isSuccess: true; isPending: false; isError: false; error: null} |
  {status: 'error'; error: E; isSuccess: false; isPending: false; isError: true} |
  {status: 'pending'; data: undefined; isSuccess: false; isPending: true; isError: false; error: null}
);
export class Subscribable<L extends (...args: any[]) => void = (...args: any[]) => void> {listeners: Set<L>; subscribe(listener: L): () => void; hasListeners(): boolean;}
export class Query<T = unknown, E = Error> extends Subscribable {
  queryKey: QueryKey; queryHash: string; state: QueryState<T, E>; options: QueryOptions<T, E>; readonly promise: Promise<T> | undefined; readonly meta: Record<string, unknown> | undefined;
  setData(data: T, options?: {updatedAt?: number; manual?: boolean}): T; setState(state: Partial<QueryState<T, E>>): void;
  isActive(): boolean; isStatic(): boolean; isDisabled(): boolean; isStale(): boolean; isStaleByTime(time?: number | 'static'): boolean; getObserversCount(): number;
  invalidate(): void; cancel(options?: {revert?: boolean; silent?: boolean}): Promise<void>; destroy(): void; reset(): void;
  fetch(options?: QueryOptions<T, E>, fetchOptions?: RefetchOptions): Promise<T>;
}
export interface QueryCacheConfig {onSuccess?: (data: unknown, query: Query<any, any>) => void; onError?: (error: Error, query: Query<any, any>) => void; onSettled?: (data: unknown, error: Error | null, query: Query<any, any>) => void;}
export class QueryCache extends Subscribable<(event: {type: string; query: Query<any, any>; observer?: QueryObserver<any, any, any>; action?: unknown}) => void> {
  constructor(config?: QueryCacheConfig); get(hash: string): Query | undefined; getAll(): Query[];
  find(filters: QueryFilters): Query | undefined; findAll(filters?: QueryFilters): Query[]; clear(): void; remove(query: Query<any, any>): void;
  build<T, E = Error>(client: QueryClient, options: QueryOptions<T, E>, state?: QueryState<T, E>): Query<T, E>;
}
export interface MutationFunctionContext {client: QueryClient; mutationKey: QueryKey | undefined; meta: Record<string, unknown> | undefined;}
export interface MutationCallbacks<T, E, V, C> {
  onSuccess?: (data: T, variables: V, context: C | undefined, mutation: MutationFunctionContext) => unknown;
  onError?: (error: E, variables: V, context: C | undefined, mutation: MutationFunctionContext) => unknown;
  onSettled?: (data: T | undefined, error: E | null, variables: V, context: C | undefined, mutation: MutationFunctionContext) => unknown;
}
export interface MutationOptions<T = unknown, E = Error, V = void, C = unknown> extends MutationCallbacks<T, E, V, C> {
  mutationKey?: QueryKey; mutationFn?: (variables: V, context: MutationFunctionContext) => T | Promise<T>;
  onMutate?: (variables: V, context: MutationFunctionContext) => C | Promise<C>;
  retry?: RetryValue<E>; retryDelay?: number | ((failureCount: number, error: E) => number); gcTime?: number;
  meta?: Record<string, unknown>; networkMode?: 'online' | 'always'; throwOnError?: boolean | ((error: E) => boolean);
}
export interface MutationState<T = unknown, E = Error, V = void, C = unknown> {data: T | undefined; error: E | null; variables: V | undefined; context: C | undefined; status: 'idle' | 'pending' | 'error' | 'success'; submittedAt: number; failureCount: number; failureReason: E | null; isPaused: boolean;}
export interface MutationObserverResult<T = unknown, E = Error, V = void, C = unknown> extends MutationState<T, E, V, C> {isIdle: boolean; isPending: boolean; isSuccess: boolean; isError: boolean; mutate(variables: V, options?: MutationCallbacks<T, E, V, C>): Promise<T>; reset(): void;}
export interface MutationFilters {mutationKey?: QueryKey; exact?: boolean; status?: MutationState['status']; predicate?: (mutation: Mutation<any, any, any, any>) => boolean;}
export class Mutation<T = unknown, E = Error, V = void, C = unknown> extends Subscribable {state: MutationState<T, E, V, C>; options: MutationOptions<T, E, V, C>; mutationId: number; execute(variables: V): Promise<T>;}
export class MutationCache extends Subscribable<(event: {type: string; mutation: Mutation<any, any, any, any>}) => void> {
  constructor(config?: Record<string, (...args: any[]) => unknown>);
  getAll(): Mutation<any, any, any, any>[]; find(filters: MutationFilters): Mutation<any, any, any, any> | undefined; findAll(filters?: MutationFilters): Mutation<any, any, any, any>[];
  clear(): void; remove(mutation: Mutation<any, any, any, any>): void;
  build<T, E, V, C>(client: QueryClient, options: MutationOptions<T, E, V, C>, state?: MutationState<T, E, V, C>): Mutation<T, E, V, C>;
}
export interface DefaultOptions {queries?: Partial<QueryOptions<any, any, any, any>>; mutations?: MutationOptions<any, any, any, any>;}
export class QueryClient {
  constructor(config?: {defaultOptions?: DefaultOptions; queryCache?: QueryCache; mutationCache?: MutationCache});
  mount(): void; unmount(): void; clear(): void;
  getQueryCache(): QueryCache; getMutationCache(): MutationCache; getDefaultOptions(): DefaultOptions; setDefaultOptions(options: DefaultOptions): void;
  getQueryData<T = unknown>(key: QueryKey): T | undefined; getQueryState<T = unknown, E = Error>(key: QueryKey): QueryState<T, E> | undefined;
  getQueriesData<T = unknown>(filters?: QueryFilters): [QueryKey, T | undefined][];
  setQueryData<T = unknown>(key: QueryKey, updater: Updater<T | undefined, T | undefined>, options?: {updatedAt?: number}): T | undefined;
  setQueriesData<T = unknown>(filters: QueryFilters, updater: Updater<T | undefined, T | undefined>, options?: {updatedAt?: number}): [QueryKey, T | undefined][];
  fetchQuery<T, E = Error, K extends QueryKey = QueryKey>(options: QueryOptions<T, E, T, K>): Promise<T>;
  prefetchQuery<T, E = Error, K extends QueryKey = QueryKey>(options: QueryOptions<T, E, T, K>): Promise<void>;
  ensureQueryData<T, E = Error, K extends QueryKey = QueryKey>(options: QueryOptions<T, E, T, K> & {revalidateIfStale?: boolean}): Promise<T>;
  isFetching(filters?: QueryFilters): number; isMutating(filters?: MutationFilters): number;
  invalidateQueries(filters?: InvalidateQueryFilters, options?: RefetchOptions): Promise<void>; refetchQueries(filters?: QueryFilters, options?: RefetchOptions): Promise<void>;
  removeQueries(filters?: QueryFilters): void; resetQueries(filters?: QueryFilters, options?: RefetchOptions): Promise<void>;
  cancelQueries(filters?: QueryFilters, options?: {revert?: boolean; silent?: boolean}): Promise<void>;
  setQueryDefaults(key: QueryKey, options: Partial<QueryOptions<any, any, any, any>>): void; getQueryDefaults(key: QueryKey): Partial<QueryOptions<any, any, any, any>>;
  setMutationDefaults(key: QueryKey, options: MutationOptions<any, any, any, any>): void; getMutationDefaults(key: QueryKey): MutationOptions<any, any, any, any>;
  defaultQueryOptions<T, E, D, K extends QueryKey>(options: QueryOptions<T, E, D, K>): QueryOptions<T, E, D, K> & {queryHash: string};
  defaultMutationOptions<T, E, V, C>(options: MutationOptions<T, E, V, C>): MutationOptions<T, E, V, C>;
}
export class QueryObserver<T = unknown, E = Error, D = T, K extends QueryKey = QueryKey> extends Subscribable<(result: QueryObserverResult<D, E>) => void> {
  constructor(client: QueryClient, options: QueryOptions<T, E, D, K>);
  options: QueryOptions<T, E, D, K>; setOptions(options: QueryOptions<T, E, D, K>, notify?: {listeners?: boolean}): void;
  getCurrentQuery(): Query<T, E>; getCurrentResult(): QueryObserverResult<D, E>; getOptimisticResult(options: QueryOptions<T, E, D, K>): QueryObserverResult<D, E>;
  refetch(options?: RefetchOptions): Promise<QueryObserverResult<D, E>>; destroy(): void;
}
export class MutationObserver<T = unknown, E = Error, V = void, C = unknown> extends Subscribable<(result: MutationObserverResult<T, E, V, C>) => void> {
  constructor(client: QueryClient, options: MutationOptions<T, E, V, C>); setOptions(options: MutationOptions<T, E, V, C>): void;
  getCurrentResult(): MutationObserverResult<T, E, V, C>; mutate(variables: V, options?: MutationCallbacks<T, E, V, C>): Promise<T>; reset(): void;
}
export const focusManager: {isFocused(): boolean; setFocused(value?: boolean): void; subscribe(fn: (focused: boolean) => void): () => void; setEventListener(fn: (notify: (value?: boolean) => void) => () => void): void;};
export const onlineManager: {isOnline(): boolean; setOnline(value: boolean): void; subscribe(fn: (online: boolean) => void): () => void; setEventListener(fn: (notify: (value: boolean) => void) => () => void): void;};
export const notifyManager: {batch<T>(fn: () => T): T; schedule(fn: () => void): void; batchCalls<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => void; setScheduler(fn: (callback: () => void) => void): void; setNotifyFunction(fn: (callback: () => void) => void): void; setBatchNotifyFunction(fn: (callback: () => void) => void): void;};
export function hashKey(key: QueryKey): string;
export function partialMatchKey(value: unknown, pattern: unknown): boolean;
export function replaceEqualDeep<T>(before: unknown, after: T): T;
export function functionalUpdate<TInput, TOutput>(updater: Updater<TInput, TOutput>, input: TInput): TOutput;
export function shallowEqualObjects(a: object, b: object): boolean;
export function matchQuery(filters: QueryFilters, query: Query<any, any>): boolean;
export function matchMutation(filters: MutationFilters, mutation: Mutation<any, any, any, any>): boolean;
export function keepPreviousData<T>(previous: T | undefined): T | undefined;
export class CancelledError extends Error {constructor(options?: {revert?: boolean; silent?: boolean}); revert?: boolean; silent?: boolean;}
export function isCancelledError(error: unknown): error is CancelledError;
export const skipToken: unique symbol;
export const isServer: boolean;
