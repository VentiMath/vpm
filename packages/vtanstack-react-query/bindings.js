// React owns subscriptions and component lifetime; the core owns requests and
// cached data. Keeping that boundary explicit avoids a second cache in hooks.
export function createBindings(React, core) {
  const QueryClientContext = React.createContext(undefined);

  function QueryClientProvider({client, children}) {
    React.useEffect(() => { client.mount(); return () => client.unmount(); }, [client]);
    return React.createElement(QueryClientContext.Provider, {value: client}, children);
  }

  function useQueryClient(provided) {
    const context = React.useContext(QueryClientContext);
    const client = provided ?? context;
    if (!client) throw new Error('No QueryClient set, use QueryClientProvider to set one');
    return client;
  }

  function useQuery(options, providedClient) {
    const client = useQueryClient(providedClient);
    const normalized = client.defaultQueryOptions(options);
    const observer = React.useMemo(() => new core.QueryObserver(client, normalized), [client, normalized.queryHash]);
    const subscribe = React.useCallback(listener => observer.subscribe(listener), [observer]);
    const snapshot = React.useCallback(() => observer.getCurrentResult(), [observer]);
    let result = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    React.useEffect(() => { observer.setOptions(options); }, [observer, options]);
    // The first render describes the request that subscription will start.
    // Requests start on subscription; cache entries can schedule collection.
    if (result.isPending && result.isEnabled && result.fetchStatus === 'idle') {
      result = {...result, fetchStatus: 'fetching', isFetching: true, isLoading: true, isInitialLoading: true};
    }
    if (result.error && (typeof options.throwOnError === 'function' ? options.throwOnError(result.error, observer.getCurrentQuery()) : options.throwOnError)) throw result.error;
    return result;
  }

  function useMutation(options, providedClient) {
    const client = useQueryClient(providedClient);
    const observer = React.useMemo(() => new core.MutationObserver(client, options), [client]);
    const subscribe = React.useCallback(listener => observer.subscribe(listener), [observer]);
    const snapshot = React.useCallback(() => observer.getCurrentResult(), [observer]);
    const result = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    React.useEffect(() => { observer.setOptions(options); }, [observer, options]);
    const mutate = React.useCallback((variables, callbacks) => { observer.mutate(variables, callbacks).catch(() => {}); }, [observer]);
    if (result.error && (typeof options.throwOnError === 'function' ? options.throwOnError(result.error) : options.throwOnError)) throw result.error;
    return {...result, mutate, mutateAsync: observer.mutate};
  }

  return {QueryClientContext, QueryClientProvider, useQueryClient, useQuery, useMutation};
}
