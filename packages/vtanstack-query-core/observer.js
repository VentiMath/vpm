import {Subscribable, enabled, staleTime, schedule, focusManager, shallowEqualObjects, replaceEqualDeep, isServer, onlineManager} from './runtime.js';

export class QueryObserver extends Subscribable {
  constructor(client, options) {
    super(); this.client = client; this.refetch = this.refetch.bind(this);
    this.options = client.defaultQueryOptions(options);
    this.query = client.getQueryCache().buildPrepared(client, this.options);
    this.mountedDataCount = this.query.state.dataUpdateCount;
    this.mountedErrorCount = this.query.state.errorUpdateCount;
    this.updateResult();
  }
  setOptions(options, notifyOptions = {}) {
    const normalized = this.client.defaultQueryOptions(options);
    const previous = this.query, wasEnabled = enabled(this.options, previous);
    const oldStale = staleTime(this.options, previous), oldInterval = this.interval();
    this.options = normalized; this.query = this.client.getQueryCache().buildPrepared(this.client, normalized);
    this.query.setOptions(normalized);
    if (previous !== this.query) {
      previous.removeObserver(this);
      this.mountedDataCount = this.query.state.dataUpdateCount; this.mountedErrorCount = this.query.state.errorUpdateCount;
      if (this.hasListeners()) this.query.addObserver(this);
    }
    this.updateResult(notifyOptions);
    if (this.hasListeners()) {
      if ((previous !== this.query || !wasEnabled) && this.stale()) this.execute();
      if (previous !== this.query || wasEnabled !== enabled(this.options, this.query) || oldStale !== staleTime(this.options, this.query) || oldInterval !== this.interval()) this.updateTimers();
    }
  }
  getCurrentQuery() { return this.query; }
  getCurrentResult() { return this.result; }
  getOptimisticResult(options) {
    const normalized = this.client.defaultQueryOptions(options);
    const query = this.client.getQueryCache().buildPrepared(this.client, normalized);
    return this.createResult(query, normalized);
  }
  trackResult(result) { return result; }
  stale() { return enabled(this.options, this.query) && this.query.isStaleByTime(staleTime(this.options, this.query)); }
  fetchOn(option) { return enabled(this.options, this.query) && staleTime(this.options, this.query) !== 'static' && (option === 'always' || option !== false && this.stale()); }
  shouldFetchOnWindowFocus() { return this.fetchOn(typeof this.options.refetchOnWindowFocus === 'function' ? this.options.refetchOnWindowFocus(this.query) : this.options.refetchOnWindowFocus); }
  shouldFetchOnReconnect() { return this.fetchOn(typeof this.options.refetchOnReconnect === 'function' ? this.options.refetchOnReconnect(this.query) : this.options.refetchOnReconnect); }
  fetchOnMount(query, options) {
    if (!enabled(options, query)) return false;
    const value = option => typeof option === 'function' ? option(query) : option;
    if (query.state.data === undefined) return query.state.status !== 'error' || value(options.retryOnMount) !== false;
    const policy = value(options.refetchOnMount), time = staleTime(options, query);
    return time !== 'static' && (policy === 'always' || policy !== false && query.isStaleByTime(time));
  }
  onSubscribe() {
    if (this.listeners.size !== 1) return;
    this.query.addObserver(this);
    if (this.fetchOnMount(this.query, this.options)) this.execute();
    this.updateTimers();
  }
  onUnsubscribe() { if (!this.hasListeners()) this.destroy(); }
  destroy() { this.stopPoll?.(); this.stopStale?.(); this.query.removeObserver(this); }
  execute(options = {}) {
    const promise = this.query.fetch(this.options, options);
    promise.catch(() => {});
    return promise;
  }
  refetch(options = {}) {
    const promise = this.execute({cancelRefetch: true, ...options});
    return (options.throwOnError ? promise : promise.catch(() => {})).then(() => { this.updateResult(); return this.result; });
  }
  fetchOptimistic(options) {
    const normalized = this.client.defaultQueryOptions(options), query = this.client.getQueryCache().buildPrepared(this.client, normalized);
    return query.fetch(normalized).then(() => this.createResult(query, normalized));
  }
  onQueryUpdate() { this.updateResult(); if (this.hasListeners()) this.updateTimers(); }
  interval() { return typeof this.options.refetchInterval === 'function' ? this.options.refetchInterval(this.query) : this.options.refetchInterval; }
  updateTimers() {
    this.stopPoll?.(); this.stopStale?.();
    if (isServer || !enabled(this.options, this.query)) return;
    const time = staleTime(this.options, this.query);
    if (time !== 'static' && Number.isFinite(time) && !this.query.isStaleByTime(time)) {
      this.stopStale = schedule(() => this.updateResult(), Math.max(0, this.query.state.dataUpdatedAt + time - Date.now()) + 1, true);
    }
    const interval = this.interval();
    if (typeof interval === 'number' && interval > 0 && interval !== Infinity) this.stopPoll = schedule(() => {
      if (this.options.refetchIntervalInBackground || focusManager.isFocused()) this.execute();
      this.updateTimers();
    }, interval, true);
  }
  createResult(query, options) {
    let state = query.state;
    if (options._optimisticResults === 'optimistic') {
      const willFetch = this.hasListeners()
        ? (query !== this.query || !enabled(this.options, query)) && enabled(options, query) && query.isStaleByTime(staleTime(options, query))
        : this.fetchOnMount(query, options);
      // Describe the next committed request without starting it or rewriting the
      // cache during render. Cached-data errors stay visible during refetches.
      if (willFetch) state = {...state,
        fetchStatus: options.networkMode === 'always' || onlineManager.isOnline() ? 'fetching' : 'paused',
        fetchFailureCount: 0, fetchFailureReason: null,
        ...(state.data === undefined ? {status: 'pending', error: null} : {})};
    }
    let {data, error, status} = state, placeholder = false;
    if (data === undefined && status === 'pending' && options.placeholderData !== undefined) {
      data = typeof options.placeholderData === 'function' ? options.placeholderData(this.lastData, this.lastDataQuery) : options.placeholderData;
      if (data !== undefined) { status = 'success'; placeholder = true; }
    }
    if (data !== undefined && options.select) {
      if (this.selectedInput === data && this.selector === options.select) { data = this.selectedData; error = this.selectError ?? error; }
      else {
        this.selector = options.select; this.selectedInput = data;
        try { this.selectedData = replaceEqualDeep(this.selectedData, options.select(data)); this.selectError = null; data = this.selectedData; }
        catch (failure) { this.selectError = failure; error = failure; data = this.selectedData; }
      }
      if (this.selectError) status = 'error';
    }
    if (state.data !== undefined) { this.lastData = state.data; this.lastDataQuery = query; }
    const pending = status === 'pending', fetching = state.fetchStatus === 'fetching', failed = status === 'error';
    return {data, error, status, fetchStatus: state.fetchStatus, dataUpdatedAt: state.dataUpdatedAt, errorUpdatedAt: state.errorUpdatedAt,
      isPending: pending, isSuccess: status === 'success', isError: failed, isLoading: pending && fetching, isInitialLoading: pending && fetching,
      isFetching: fetching, isRefetching: fetching && !pending, isPaused: state.fetchStatus === 'paused', isPlaceholderData: placeholder,
      isLoadingError: failed && data === undefined, isRefetchError: failed && data !== undefined,
      isFetched: state.dataUpdateCount > 0 || state.errorUpdateCount > 0,
      isFetchedAfterMount: state.dataUpdateCount > this.mountedDataCount || state.errorUpdateCount > this.mountedErrorCount,
      isStale: enabled(options, query) && query.isStaleByTime(staleTime(options, query)),
      isEnabled: enabled(options, query), failureCount: state.fetchFailureCount, failureReason: state.fetchFailureReason,
      errorUpdateCount: state.errorUpdateCount, refetch: this.refetch};
  }
  updateResult(options = {}) {
    const next = this.createResult(this.query, this.options);
    if (this.result && shallowEqualObjects(this.result, next)) return;
    this.result = next;
    if (options.listeners !== false) this.emit(next);
  }
}
