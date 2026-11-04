// React owns subscriptions and component lifetime; the core owns requests and
// cached data. Keeping that boundary explicit avoids a second cache in hooks.
export function createBindings(React, core) {
  const QueryClientContext = React.createContext(undefined);

  function subscribeToObserver(observer, listener) {
    let active = true;
    // Keep cache writes synchronous, but deliver React updates through the
    // notification scheduler. Immediate store notifications can interrupt an
    // async transition while its action is still settling.
    const unsubscribe = observer.subscribe(core.notifyManager.batchCalls(() => {
      if (active) listener();
    }));
    return () => { active = false; unsubscribe(); };
  }

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
    normalized._optimisticResults = 'optimistic';
    const observer = React.useMemo(() => new core.QueryObserver(client, normalized), [client, normalized.queryHash]);
    const subscribe = React.useCallback(listener => subscribeToObserver(observer, listener), [observer]);
    const snapshot = React.useCallback(() => observer.getCurrentResult(), [observer]);
    const result = observer.getOptimisticResult(normalized);
    React.useSyncExternalStore(subscribe, snapshot, snapshot);
    React.useEffect(() => { observer.setOptions(normalized); }, [observer, options]);
    if (result.error && (typeof options.throwOnError === 'function' ? options.throwOnError(result.error, observer.getCurrentQuery()) : options.throwOnError)) throw result.error;
    return result;
  }

  function useMutation(options, providedClient) {
    const client = useQueryClient(providedClient);
    const observer = React.useMemo(() => new core.MutationObserver(client, options), [client]);
    const subscribe = React.useCallback(listener => subscribeToObserver(observer, listener), [observer]);
    const snapshot = React.useCallback(() => observer.getCurrentResult(), [observer]);
    const result = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    React.useEffect(() => { observer.setOptions(options); }, [observer, options]);
    const mutate = React.useCallback((variables, callbacks) => { observer.mutate(variables, callbacks).catch(() => {}); }, [observer]);
    if (result.error && (typeof options.throwOnError === 'function' ? options.throwOnError(result.error) : options.throwOnError)) throw result.error;
    return {...result, mutate, mutateAsync: observer.mutate};
  }

  return {QueryClientContext, QueryClientProvider, useQueryClient, useQuery, useMutation};
}
