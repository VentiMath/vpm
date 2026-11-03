import {Subscribable, hashKey, partialMatchKey, replaceEqualDeep, functionalUpdate, enabled, staleTime, schedule, onlineManager, focusManager, isServer, CancelledError} from './runtime.js';
import {MutationCache} from './mutation.js';

const initialState = options => {
  const data = typeof options.initialData === 'function' ? options.initialData() : options.initialData;
  return {data, dataUpdateCount: 0, dataUpdatedAt: data === undefined ? 0 : (typeof options.initialDataUpdatedAt === 'function' ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt) ?? Date.now(),
    error: null, errorUpdateCount: 0, errorUpdatedAt: 0, fetchFailureCount: 0, fetchFailureReason: null,
    fetchMeta: null, isInvalidated: false, status: data === undefined ? 'pending' : 'success', fetchStatus: 'idle'};
};

export function matchQuery(filters, query) {
  if (filters.queryKey && !(filters.exact ? query.queryHash === (query.options.queryKeyHashFn ?? hashKey)(filters.queryKey) : partialMatchKey(query.queryKey, filters.queryKey))) return false;
  if (filters.type === 'active' && !query.isActive() || filters.type === 'inactive' && query.isActive()) return false;
  if (filters.stale !== undefined && query.isStale() !== filters.stale) return false;
  if (filters.fetchStatus !== undefined && query.state.fetchStatus !== filters.fetchStatus) return false;
  return !filters.predicate || filters.predicate(query);
}

export class Query extends Subscribable {
  observers = new Set();
  constructor(client, cache, options) {
    super(); this.client = client; this.cache = cache; this.options = options;
    this.queryKey = options.queryKey; this.queryHash = options.queryHash;
    this.state = initialState(options); this.initial = {...this.state}; this.gcTime = 0;
    this.setOptions(options); this.collectLater();
  }
  setOptions(options) { this.options = options; this.gcTime = Math.max(this.gcTime, options.gcTime ?? (isServer ? Infinity : 300000)); }
  get meta() { return this.options.meta; }
  get promise() { return this.flight?.promise; }
  setState(update, action = {type: 'setState'}) {
    this.state = {...this.state, ...update}; this.emit(this.state);
    for (const observer of this.observers) observer.onQueryUpdate();
    this.cache.emit({type: 'updated', query: this, action});
  }
  setData(data, options = {}) {
    const value = this.options.structuralSharing === false ? data : typeof this.options.structuralSharing === 'function'
      ? this.options.structuralSharing(this.state.data, data) : replaceEqualDeep(this.state.data, data);
    this.setState({data: value, dataUpdatedAt: options.updatedAt ?? Date.now(), dataUpdateCount: this.state.dataUpdateCount + 1,
      error: null, isInvalidated: false, status: 'success', ...(options.manual === false ? {fetchStatus: 'idle', fetchFailureCount: 0, fetchFailureReason: null} : {})}, {type: 'success', data: value, manual: options.manual !== false});
    return value;
  }
  isActive() { return [...this.observers].some(observer => enabled(observer.options, this)); }
  isStatic() { return this.state.data !== undefined && [...this.observers].some(observer => staleTime(observer.options, this) === 'static'); }
  isDisabled() { return this.observers.size > 0 ? !this.isActive() : !this.options.queryFn; }
  isStaleByTime(time = 0) { return this.state.data === undefined || time !== 'static' && (this.state.isInvalidated || Date.now() - this.state.dataUpdatedAt >= time); }
  isStale() { return this.observers.size ? [...this.observers].some(o => o.getCurrentResult().isStale) : this.state.data === undefined || this.state.isInvalidated; }
  getObserversCount() { return this.observers.size; }
  addObserver(observer) {
    if (this.observers.has(observer)) return;
    this.stopGc?.(); this.observers.add(observer); this.cache.emit({type: 'observerAdded', query: this, observer});
  }
  removeObserver(observer) {
    if (!this.observers.delete(observer)) return;
    this.cache.emit({type: 'observerRemoved', query: this, observer});
    if (!this.observers.size) {
      if (this.flight?.consumedSignal) this.cancel({revert: true});
      else if (this.flight) this.flight.stopRetries = true;
      this.collectLater();
    }
  }
  collectLater() {
    this.stopGc?.();
    if (!this.observers.size && !this.flight) this.stopGc = schedule(() => this.cache.remove(this), this.gcTime, true);
  }
  invalidate() { if (!this.state.isInvalidated) this.setState({isInvalidated: true}, {type: 'invalidate'}); }
  cancel(options = {revert: true}) {
    const flight = this.flight;
    if (!flight) return Promise.resolve();
    this.flight = undefined; flight.stopWait?.(); flight.controller.abort();
    const error = new CancelledError(options);
    if (options.revert) this.setState({...flight.before, fetchStatus: 'idle'});
    else this.setState({fetchStatus: 'idle'});
    flight.reject(error); this.collectLater();
    return flight.promise.catch(() => {});
  }
  destroy() { this.stopGc?.(); this.cancel({silent: true, revert: true}); this.stopGc?.(); }
  reset() { this.cancel({revert: true}); this.setState({...this.initial}); }
  fetch(options = this.options, fetchOptions = {}) {
    if (this.flight) {
      if (fetchOptions.cancelRefetch && this.state.data !== undefined) this.cancel({silent: true, revert: true});
      else { this.flight.stopRetries = false; return this.flight.promise; }
    }
    if (typeof options.queryFn !== 'function') {
      const source = [...this.observers].find(observer => typeof observer.options.queryFn === 'function');
      if (source) options = {...options, queryFn: source.options.queryFn};
    }
    this.setOptions(options); this.stopGc?.();
    const controller = new AbortController();
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    // Observers may start requests without a direct promise consumer.
    promise.catch(() => {});
    const flight = {promise, resolve, reject, controller, before: this.state, consumedSignal: false, stopRetries: false};
    this.flight = flight;
    const context = {client: this.client, queryKey: this.queryKey, meta: options.meta};
    Object.defineProperty(context, 'signal', {enumerable: true, get: () => { flight.consumedSignal = true; return controller.signal; }});
    let failures = 0;
    const canRun = () => (options.networkMode === 'always' || onlineManager.isOnline()) && (failures === 0 || focusManager.isFocused());
    this.setState({fetchStatus: canRun() ? 'fetching' : 'paused', fetchFailureCount: 0, fetchFailureReason: null,
      ...(this.state.data === undefined ? {status: 'pending', error: null} : {})}, {type: 'fetch'});
    const wait = delay => new Promise(resolveWait => { flight.stopWait = schedule(resolveWait, delay); });
    const connection = () => new Promise(resolveWait => {
      const resume = () => { if (canRun()) { flight.stopWait(); resolveWait(); } };
      const stops = [onlineManager.subscribe(resume), focusManager.subscribe(resume)];
      flight.stopWait = () => stops.forEach(stop => stop());
      resume();
    });
    queueMicrotask(async () => {
      while (this.flight === flight) {
        let received = false;
        try {
          if (!canRun()) { this.setState({fetchStatus: 'paused'}); if (this.flight !== flight) return; await connection(); }
          if (this.flight !== flight) return;
          if (this.state.fetchStatus !== 'fetching') this.setState({fetchStatus: 'fetching'});
          if (typeof options.queryFn !== 'function') throw new Error(`Missing queryFn: '${this.queryHash}'`);
          const data = await options.queryFn(context);
          if (this.flight !== flight) return;
          if (data === undefined) throw new Error(`Query data cannot be undefined: '${this.queryHash}'`);
          received = true;
          this.setData(data, {manual: false});
          this.cache.config.onSuccess?.(data, this); this.cache.config.onSettled?.(data, null, this);
          if (this.flight !== flight) return;
          this.flight = undefined; this.collectLater(); resolve(this.state.data); return;
        } catch (error) {
          if (this.flight !== flight) return;
          const retry = options.retry ?? (isServer ? 0 : 3);
          const again = !received && !flight.stopRetries && (retry === true || typeof retry === 'number' && failures < retry || typeof retry === 'function' && retry(failures, error));
          if (again) {
            const delay = typeof options.retryDelay === 'function' ? options.retryDelay(failures, error) : options.retryDelay ?? Math.min(1000 * 2 ** failures, 30000);
            failures++;
            this.setState({fetchFailureCount: failures, fetchFailureReason: error});
            if (this.flight !== flight) return;
            await wait(delay);
            if (this.flight !== flight) return;
            if (flight.stopRetries) {
              this.flight = undefined;
              this.setState({error, status: 'error', fetchStatus: 'idle', fetchFailureCount: failures, fetchFailureReason: error, errorUpdatedAt: Date.now(), errorUpdateCount: this.state.errorUpdateCount + 1});
              this.collectLater(); reject(error); return;
            }
            continue;
          }
          this.flight = undefined;
          this.setState({error, errorUpdatedAt: Date.now(), errorUpdateCount: this.state.errorUpdateCount + 1,
            status: 'error', fetchStatus: 'idle', fetchFailureCount: failures + 1, fetchFailureReason: error}, {type: 'error', error});
          try { this.cache.config.onError?.(error, this); this.cache.config.onSettled?.(this.state.data, error, this); }
          catch (callbackError) { error = callbackError; }
          this.collectLater(); reject(error); return;
        }
      }
    });
    return promise;
  }
}

export class QueryCache extends Subscribable {
  entries = new Map();
  constructor(config = {}) { super(); this.config = config; }
  build(client, options, state) { return this.buildPrepared(client, client.defaultQueryOptions(options), state); }
  buildPrepared(client, normalized, state) {
    let query = this.entries.get(normalized.queryHash);
    if (!query) { query = new Query(client, this, normalized); if (state) query.state = state; this.add(query); }
    return query;
  }
  add(query) { if (!this.entries.has(query.queryHash)) { this.entries.set(query.queryHash, query); this.emit({type: 'added', query}); } }
  remove(query) { if (this.entries.get(query.queryHash) === query) { this.entries.delete(query.queryHash); query.destroy(); this.emit({type: 'removed', query}); } }
  clear() { for (const query of this.getAll()) this.remove(query); }
  get(hash) { return this.entries.get(hash); }
  getAll() { return [...this.entries.values()]; }
  find(filters) { return this.findAll({exact: true, ...filters})[0]; }
  findAll(filters = {}) { return this.getAll().filter(query => matchQuery(filters, query)); }
  notify(event) { this.emit(event); }
  onFocus() { for (const query of this.getAll()) for (const observer of query.observers) if (observer.shouldFetchOnWindowFocus()) { observer.refetch({cancelRefetch: false}); break; } }
  onOnline() { for (const query of this.getAll()) for (const observer of query.observers) if (observer.shouldFetchOnReconnect()) { observer.refetch({cancelRefetch: false}); break; } }
}

export class QueryClient {
  queryDefaults = []; mutationDefaults = []; mountCount = 0;
  constructor(config = {}) { this.defaults = config.defaultOptions ?? {}; this.queryCache = config.queryCache ?? new QueryCache(); this.mutationCache = config.mutationCache ?? new MutationCache(); }
  mount() {
    if (++this.mountCount !== 1) return;
    this.stopFocus = focusManager.subscribe(focused => { if (focused) this.queryCache.onFocus(); });
    this.stopOnline = onlineManager.subscribe(online => { if (online) this.queryCache.onOnline(); });
  }
  unmount() { if (this.mountCount && --this.mountCount === 0) { this.stopFocus?.(); this.stopOnline?.(); } }
  getQueryCache() { return this.queryCache; }
  getMutationCache() { return this.mutationCache; }
  getDefaultOptions() { return this.defaults; }
  setDefaultOptions(options) { this.defaults = options; }
  setDefaults(list, key, options) { const found = list.find(item => hashKey(item.key) === hashKey(key)); if (found) found.options = options; else list.push({key, options}); }
  setQueryDefaults(key, options) { this.setDefaults(this.queryDefaults, key, options); }
  setMutationDefaults(key, options) { this.setDefaults(this.mutationDefaults, key, options); }
  getQueryDefaults(key) { return Object.assign({}, ...this.queryDefaults.filter(item => partialMatchKey(key, item.key)).map(item => item.options)); }
  getMutationDefaults(key) { return Object.assign({}, ...this.mutationDefaults.filter(item => partialMatchKey(key, item.key)).map(item => item.options)); }
  defaultQueryOptions(options = {}) { const result = {...this.defaults.queries, ...(this.queryDefaults.length ? this.getQueryDefaults(options.queryKey) : undefined), ...options}; result.queryHash ??= (result.queryKeyHashFn ?? hashKey)(result.queryKey); return result; }
  defaultMutationOptions(options = {}) { return {...this.defaults.mutations, ...(options.mutationKey ? this.getMutationDefaults(options.mutationKey) : {}), ...options}; }
  getQueryState(key) { return this.queryCache.get(this.defaultQueryOptions({queryKey: key}).queryHash)?.state; }
  getQueryData(key) { return this.getQueryState(key)?.data; }
  getQueriesData(filters) { return this.queryCache.findAll(filters).map(query => [query.queryKey, query.state.data]); }
  setQueryData(key, updater, options) {
    const data = functionalUpdate(updater, this.getQueryData(key));
    if (data === undefined) return undefined;
    return this.queryCache.build(this, {queryKey: key}).setData(data, options);
  }
  setQueriesData(filters, updater, options) { return this.queryCache.findAll(filters).map(query => [query.queryKey, this.setQueryData(query.queryKey, updater, options)]); }
  fetchQuery(options) { const normalized = this.defaultQueryOptions(options); normalized.retry ??= false; const query = this.queryCache.buildPrepared(this, normalized); return query.isStaleByTime(staleTime(normalized, query)) ? query.fetch(normalized) : Promise.resolve(query.state.data); }
  prefetchQuery(options) { return this.fetchQuery(options).then(() => {}, () => {}); }
  ensureQueryData(options) { const data = this.getQueryData(options.queryKey); if (data === undefined) return this.fetchQuery(options); if (options.revalidateIfStale) this.prefetchQuery(options); return Promise.resolve(data); }
  isFetching(filters = {}) { return this.queryCache.findAll({...filters, fetchStatus: 'fetching'}).length; }
  isMutating(filters = {}) { return this.mutationCache.findAll({...filters, status: 'pending'}).length; }
  removeQueries(filters) { for (const query of this.queryCache.findAll(filters)) this.queryCache.remove(query); }
  cancelQueries(filters, options = {}) { return Promise.all(this.queryCache.findAll(filters).map(query => query.cancel({revert: true, ...options}))).then(() => {}); }
  invalidateQueries(filters = {}, options) {
    for (const query of this.queryCache.findAll(filters)) query.invalidate();
    return filters.refetchType === 'none' ? Promise.resolve() : this.refetchQueries({...filters, type: filters.refetchType ?? filters.type ?? 'active'}, options);
  }
  refetchQueries(filters = {}, options = {}) { return Promise.all(this.queryCache.findAll(filters).filter(query => !query.isDisabled() && !query.isStatic()).map(query => {
    const promise = query.fetch(query.options, {cancelRefetch: true, ...options});
    return query.state.fetchStatus === 'paused' ? Promise.resolve() : options.throwOnError ? promise : promise.catch(() => {});
  })).then(() => {}); }
  resetQueries(filters, options) { for (const query of this.queryCache.findAll(filters)) query.reset(); return this.refetchQueries({...filters, type: 'active'}, options); }
  clear() { this.queryCache.clear(); this.mutationCache?.clear(); }
}
